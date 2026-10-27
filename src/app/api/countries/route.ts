import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiRoute, apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { listCountries } from "@/lib/provider/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiRoute(async () => {
    const { user } = await requireApiUser();
    const fresh = new URL(request.url).searchParams.get("fresh") === "1";
    await enforceRateLimit(`catalog:countries:${user.id}`, 60, 60);
    const countries = await listCountries({ fresh });
    return apiSuccess({ countries });
  });
}
