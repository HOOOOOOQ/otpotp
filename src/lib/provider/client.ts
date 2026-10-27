import "server-only";
import { PROVIDER_TIMEOUT_MS } from "@/lib/constants";
import { ProviderError, type ProviderEndpoint } from "@/lib/provider/types";

/** Fixed provider origin. Endpoint names are a closed union; no user-supplied URLs are accepted. */
export const PROVIDER_BASE_URL = "https://api.jasaotp.id/v2/";

const KEYED_ENDPOINTS = new Set<ProviderEndpoint>([
  "order.php",
  "sms.php",
  "balance.php",
  "cancel.php",
]);

export interface ProviderRequestOptions {
  requiresKey?: boolean;
  timeoutMs?: number;
}

export async function callProvider(
  endpoint: ProviderEndpoint,
  params: Record<string, string | number> = {},
  options: ProviderRequestOptions = {},
): Promise<unknown> {
  const requiresKey = options.requiresKey ?? KEYED_ENDPOINTS.has(endpoint);
  const apiKey = process.env.JASAOTP_API_KEY?.trim();
  if (requiresKey && !apiKey) {
    throw new ProviderError(
      "config",
      "Kredensial penyedia belum dikonfigurasi. Hubungi administrator.",
    );
  }

  const url = new URL(endpoint, PROVIDER_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  // The API key exists only in this server-side URL object; it is never serialized to the client.
  if (requiresKey && apiKey) url.searchParams.set("api_key", apiKey);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "KaiiOTP/1.0 (+server-proxy)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? PROVIDER_TIMEOUT_MS),
    });
  } catch {
    throw new ProviderError(
      "transport",
      "Penyedia tidak merespons tepat waktu. Status operasi belum dapat dipastikan.",
    );
  }

  if (response.status === 429) {
    throw new ProviderError(
      "rate_limited",
      "Penyedia sedang membatasi permintaan. Coba lagi beberapa saat.",
      response.status,
    );
  }

  let payload: unknown;
  try {
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > 2_000_000) {
      throw new ProviderError("invalid_response", "Respons penyedia terlalu besar.");
    }
    payload = JSON.parse(await response.text());
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    // A non-JSON failure is ambiguous for state-changing endpoints; do not claim success or failure.
    if (!response.ok) {
      throw new ProviderError(
        "transport",
        "Penyedia mengembalikan respons yang tidak dapat dipastikan.",
        response.status,
      );
    }
    throw new ProviderError("invalid_response", "Respons penyedia bukan JSON yang valid.");
  }

  if (!response.ok) {
    // Parsers below still validate `success`. Here we only classify transport vs business errors.
    const record = payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
    if (record && (record.success === false || record.success === "false")) {
      return payload;
    }
    throw new ProviderError(
      "transport",
      "Penyedia mengembalikan respons yang tidak dapat dipastikan.",
      response.status,
    );
  }

  return payload;
}
