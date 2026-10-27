import { readCountryId } from "@/lib/api/query";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { listOperators } from "@/lib/provider/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiRoute(async () => {
    const { user } = await requireApiUser();
    const countryId = readCountryId(request);
    const fresh = new URL(request.url).searchParams.get("fresh") === "1";
    await enforceRateLimit(`catalog:operators:${user.id}`, 120, 60);
    const operators = await listOperators(countryId, { fresh });
    return apiSuccess({ negara: countryId, operators });
  });
}
