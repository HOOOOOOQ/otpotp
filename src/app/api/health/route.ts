import { apiRoute, apiSuccess } from "@/lib/api/response";
import { getConfigStatus } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiRoute(async () => {
    const config = getConfigStatus();
    return apiSuccess({
      status: "ok",
      time: new Date().toISOString(),
      configured: Object.values(config).every(Boolean),
      checks: config,
    });
  });
}
