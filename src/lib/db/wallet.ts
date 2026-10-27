import "server-only";
import { mapDatabaseError } from "@/lib/db/errors";
import { callRpc, rpcString } from "@/lib/db/rpc";
import type { DepositRequestRow } from "@/lib/db/types";
import { getAdminClient } from "@/lib/supabase/admin";

const DEPOSIT_COLUMNS =
  "id,user_id,amount_idr,payment_reference,note,status,admin_note,reviewed_at,created_at";
const DEPOSIT_ADMIN_COLUMNS = `${DEPOSIT_COLUMNS},profiles!deposit_requests_user_id_fkey(email)`;

export async function createDepositRequest(args: {
  userId: string;
  amountIdr: number;
  paymentReference: string;
  note: string;
}): Promise<DepositRequestRow> {
  const { data, error } = await getAdminClient()
    .from("deposit_requests")
    .insert({
      user_id: args.userId,
      amount_idr: args.amountIdr,
      payment_reference: args.paymentReference,
      note: args.note || null,
      status: "pending",
    })
    .select(DEPOSIT_COLUMNS)
    .single();
  if (error) throw mapDatabaseError(error);
  return data as DepositRequestRow;
}

export async function listDepositRequestsForUser(userId: string): Promise<DepositRequestRow[]> {
  const { data, error } = await getAdminClient()
    .from("deposit_requests")
    .select(DEPOSIT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw mapDatabaseError(error);
  return (data as DepositRequestRow[] | null) ?? [];
}

export async function listDepositRequestsForAdmin(): Promise<DepositRequestRow[]> {
  const { data, error } = await getAdminClient()
    .from("deposit_requests")
    .select(DEPOSIT_ADMIN_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw mapDatabaseError(error);
  return (data as DepositRequestRow[] | null) ?? [];
}

export async function approveDeposit(args: {
  requestId: string;
  adminId: string;
  adminNote: string;
}): Promise<string> {
  const result = await callRpc("approve_deposit_request", {
    p_request_id: args.requestId,
    p_admin_id: args.adminId,
    p_admin_note: args.adminNote || null,
  });
  return rpcString(result, "outcome") ?? "already_processed";
}

export async function rejectDeposit(args: {
  requestId: string;
  adminId: string;
  adminNote: string;
}): Promise<string> {
  const result = await callRpc("reject_deposit_request", {
    p_request_id: args.requestId,
    p_admin_id: args.adminId,
    p_admin_note: args.adminNote || null,
  });
  return rpcString(result, "outcome") ?? "already_processed";
}
