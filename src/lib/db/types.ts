import type { OrderStatus } from "@/lib/types";

export interface OrderRow {
  id: string;
  user_id: string;
  provider_order_id: string | null;
  phone_number: string | null;
  country_id: number;
  country_name: string;
  service_code: string;
  service_name: string;
  operator: string;
  price_idr: number | string;
  status: OrderStatus;
  otp_code: string | null;
  otp_expires_at: string | null;
  otp_received_at: string | null;
  provider_expires_at: string | null;
  cancel_pending_at: string | null;
  cancel_idempotency_key: string | null;
  provider_error_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  order_id: string | null;
  type: "debit" | "refund" | "deposit";
  amount_idr: number | string;
  balance_after_idr: number | string;
  description: string;
  created_at: string;
}

export interface DepositRequestRow {
  id: string;
  user_id: string;
  amount_idr: number | string;
  payment_reference: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: { email: string } | { email: string }[] | null;
}

export interface SupportMessageRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "resolved";
  created_at: string;
  updated_at: string;
}

export interface RpcObject {
  outcome?: string;
  status?: string;
  order_id?: string | null;
  otp_code?: string | null;
  otp_expires_at?: string | null;
  provider_order_id?: string | null;
  price_idr?: number | string | null;
  refunded_amount_idr?: number | string | null;
  balance_idr?: number | string | null;
  [key: string]: unknown;
}
