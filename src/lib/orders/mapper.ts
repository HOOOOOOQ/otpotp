import type { OrderRow, TransactionRow, DepositRequestRow, SupportMessageRow } from "@/lib/db/types";
import type {
  DepositRequestView,
  PublicOrder,
  SupportMessageView,
  TransactionView,
} from "@/lib/types";

export function toPublicOrder(row: OrderRow, includeOtp = false): PublicOrder {
  return {
    id: row.id,
    providerOrderId: row.provider_order_id,
    phoneNumber: row.phone_number,
    countryId: row.country_id,
    countryName: row.country_name,
    serviceCode: row.service_code,
    serviceName: row.service_name,
    operator: row.operator,
    priceIdr: Number(row.price_idr),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.provider_expires_at,
    otpCode: includeOtp ? row.otp_code : null,
    otpExpiresAt: includeOtp ? row.otp_expires_at : null,
    providerErrorCode: row.provider_error_code,
  };
}

export function toTransactionView(row: TransactionRow): TransactionView {
  return {
    id: row.id,
    orderId: row.order_id,
    type: row.type,
    amountIdr: Number(row.amount_idr),
    balanceAfterIdr: Number(row.balance_after_idr),
    description: row.description,
    createdAt: row.created_at,
  };
}

export function toDepositRequestView(row: DepositRequestRow): DepositRequestView {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: profile?.email ?? null,
    amountIdr: Number(row.amount_idr),
    paymentReference: row.payment_reference,
    note: row.note,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export function toSupportMessageView(row: SupportMessageRow): SupportMessageView {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}
