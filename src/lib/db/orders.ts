import "server-only";
import { mapDatabaseError } from "@/lib/db/errors";
import { callRpc, rpcNumber, rpcString } from "@/lib/db/rpc";
import type { OrderRow, RpcObject, TransactionRow } from "@/lib/db/types";
import { getAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/types";

const ORDER_COLUMNS = [
  "id",
  "user_id",
  "provider_order_id",
  "phone_number",
  "country_id",
  "country_name",
  "service_code",
  "service_name",
  "operator",
  "price_idr",
  "status",
  "otp_code",
  "otp_expires_at",
  "otp_received_at",
  "provider_expires_at",
  "cancel_pending_at",
  "cancel_idempotency_key",
  "provider_error_code",
  "created_at",
  "updated_at",
].join(",");

export interface ReserveOrderArgs {
  userId: string;
  idempotencyKey: string;
  requestHash: string;
  countryId: number;
  countryName: string;
  serviceCode: string;
  serviceName: string;
  operator: string;
  priceIdr: number;
}

export interface ReserveOrderResult {
  outcome: "reserved" | "duplicate";
  orderId: string | null;
  status: OrderStatus | null;
  balanceIdr: number | null;
}

export async function reserveOrder(args: ReserveOrderArgs): Promise<ReserveOrderResult> {
  const result = await callRpc("reserve_order", {
    p_user_id: args.userId,
    p_idempotency_key: args.idempotencyKey,
    p_request_hash: args.requestHash,
    p_country_id: args.countryId,
    p_country_name: args.countryName,
    p_service_code: args.serviceCode,
    p_service_name: args.serviceName,
    p_operator: args.operator,
    p_price_idr: args.priceIdr,
  });
  return {
    outcome: result.outcome === "duplicate" ? "duplicate" : "reserved",
    orderId: rpcString(result, "order_id"),
    status: (rpcString(result, "status") as OrderStatus | null) ?? null,
    balanceIdr: rpcNumber(result, "balance_idr"),
  };
}

export async function finalizeOrderCreation(args: {
  orderId: string;
  providerOrderId: string;
  phoneNumber: string;
  expiresAt: string | null;
}): Promise<void> {
  await callRpc("finalize_order_creation", {
    p_order_id: args.orderId,
    p_provider_order_id: args.providerOrderId,
    p_phone_number: args.phoneNumber,
    p_provider_expires_at: args.expiresAt,
  });
}

export async function refundUnfilledOrder(orderId: string, reasonCode: string): Promise<void> {
  await callRpc("refund_unfilled_order", {
    p_order_id: orderId,
    p_reason_code: reasonCode.slice(0, 80),
  });
}

export async function markOrderNeedsReview(orderId: string, reasonCode: string): Promise<void> {
  await callRpc("mark_order_needs_review", {
    p_order_id: orderId,
    p_reason_code: reasonCode.slice(0, 80),
  });
}

export async function getOrderRow(
  userId: string,
  orderId: string,
): Promise<OrderRow | null> {
  const admin = getAdminClient();
  await callRpc("purge_expired_otp", { p_order_id: orderId, p_user_id: userId });
  const { data, error } = await admin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw mapDatabaseError(error);
  return (data as OrderRow | null) ?? null;
}

export async function listOrderRows(
  userId: string,
  options: { limit?: number; status?: OrderStatus } = {},
): Promise<OrderRow[]> {
  const admin = getAdminClient();
  await callRpc("purge_expired_otps_for_user", { p_user_id: userId });
  let query = admin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(options.limit ?? 100, 100));
  if (options.status) query = query.eq("status", options.status);
  const { data, error } = await query;
  if (error) throw mapDatabaseError(error);
  return (data as unknown as OrderRow[] | null) ?? [];
}

export async function markOrderOtp(args: {
  orderId: string;
  userId: string;
  code: string;
  ttlSeconds: number;
}): Promise<RpcObject> {
  return callRpc("mark_order_otp", {
    p_order_id: args.orderId,
    p_user_id: args.userId,
    p_otp_code: args.code,
    p_ttl_seconds: args.ttlSeconds,
  });
}

export async function setOrderTerminalStatus(args: {
  orderId: string;
  userId: string;
  status: "cancelled" | "expired" | "failed" | "needs_review";
  reasonCode: string;
}): Promise<void> {
  await callRpc("set_order_terminal_status", {
    p_order_id: args.orderId,
    p_user_id: args.userId,
    p_status: args.status,
    p_reason_code: args.reasonCode.slice(0, 80),
  });
}

export interface CancelClaimResult {
  outcome: "claimed" | "in_progress" | "already_final" | "not_cancellable";
  status: OrderStatus | null;
  providerOrderId: string | null;
}

export async function requestOrderCancel(args: {
  orderId: string;
  userId: string;
  idempotencyKey: string;
}): Promise<CancelClaimResult> {
  const result = await callRpc("request_order_cancel", {
    p_order_id: args.orderId,
    p_user_id: args.userId,
    p_idempotency_key: args.idempotencyKey,
  });
  return {
    outcome: (result.outcome ?? "not_cancellable") as CancelClaimResult["outcome"],
    status: (rpcString(result, "status") as OrderStatus | null) ?? null,
    providerOrderId: rpcString(result, "provider_order_id"),
  };
}

export async function finalizeOrderCancel(args: {
  orderId: string;
  userId: string;
  idempotencyKey: string;
  refundedAmountIdr: number;
}): Promise<{ refundedAmountIdr: number; balanceIdr: number | null }> {
  const result = await callRpc("finalize_order_cancel", {
    p_order_id: args.orderId,
    p_user_id: args.userId,
    p_idempotency_key: args.idempotencyKey,
    p_refunded_amount_idr: args.refundedAmountIdr,
  });
  return {
    refundedAmountIdr: rpcNumber(result, "refunded_amount_idr") ?? 0,
    balanceIdr: rpcNumber(result, "balance_idr"),
  };
}

export async function failOrderCancel(args: {
  orderId: string;
  userId: string;
  idempotencyKey: string;
  reasonCode: string;
}): Promise<void> {
  await callRpc("fail_order_cancel", {
    p_order_id: args.orderId,
    p_user_id: args.userId,
    p_idempotency_key: args.idempotencyKey,
    p_reason_code: args.reasonCode.slice(0, 80),
  });
}

export async function reviewOrderCancel(args: {
  orderId: string;
  userId: string;
  idempotencyKey: string;
  reasonCode: string;
}): Promise<void> {
  await callRpc("review_order_cancel", {
    p_order_id: args.orderId,
    p_user_id: args.userId,
    p_idempotency_key: args.idempotencyKey,
    p_reason_code: args.reasonCode.slice(0, 80),
  });
}

export async function listTransactionRows(userId: string, limit = 100): Promise<TransactionRow[]> {
  const { data, error } = await getAdminClient()
    .from("transactions")
    .select("id,user_id,order_id,type,amount_idr,balance_after_idr,description,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));
  if (error) throw mapDatabaseError(error);
  return (data as TransactionRow[] | null) ?? [];
}
