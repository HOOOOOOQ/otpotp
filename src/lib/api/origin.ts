import { AppError } from "@/lib/api/errors";

export function getTrustedAppOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the request host when APP_URL is malformed.
    }
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function getConfiguredOrigins(): string[] {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return [];
  try {
    return [new URL(configured).origin];
  } catch {
    return [];
  }
}

/**
 * Same-origin check for cookie-authenticated state-changing requests.
 * Browser fetch always sends Origin on cross-origin and usually on same-origin POST.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const secFetchSite = request.headers.get("sec-fetch-site");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  if (!origin) {
    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
      throw new AppError("CSRF_REJECTED", "Permintaan ditolak karena asal tidak sesuai.", 403);
    }
    return;
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new AppError("CSRF_REJECTED", "Permintaan ditolak karena asal tidak valid.", 403);
  }

  const allowed = new Set<string>(getConfiguredOrigins());
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // Ignore malformed internal URL; host-based origins below still apply.
  }
  if (host) {
    allowed.add(`${proto}://${host}`);
    allowed.add(`http://${host}`);
    allowed.add(`https://${host}`);
  }

  if (!allowed.has(parsedOrigin.origin)) {
    throw new AppError("CSRF_REJECTED", "Permintaan ditolak karena asal tidak sesuai.", 403);
  }
}
