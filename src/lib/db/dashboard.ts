import "server-only";
import { AppError } from "@/lib/api/errors";
import { listOrderRows } from "@/lib/db/orders";
import { toPublicOrder } from "@/lib/orders/mapper";
import { getAdminClient } from "@/lib/supabase/admin";
import type { DashboardSummary, ProfileView } from "@/lib/types";

async function countOrders(userId: string, statuses?: string[]): Promise<number> {
  let query = getAdminClient()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (statuses) query = query.in("status", statuses);
  const { count, error } = await query;
  if (error) throw new AppError("DATABASE_ERROR", "Ringkasan tidak dapat dimuat.", 500);
  return count ?? 0;
}

export async function getDashboardSummary(profile: ProfileView): Promise<DashboardSummary> {
  const [total, active, otpReceived, recentRows] = await Promise.all([
    countOrders(profile.id),
    countOrders(profile.id, ["processing", "waiting_otp", "cancel_pending"]),
    countOrders(profile.id, ["otp_received"]),
    listOrderRows(profile.id, { limit: 5 }),
  ]);
  return {
    profile,
    counts: { total, active, otpReceived },
    recentOrders: recentRows.map((row) => toPublicOrder(row, false)),
  };
}
