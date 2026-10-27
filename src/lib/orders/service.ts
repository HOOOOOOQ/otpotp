import "server-only";
import { AppError } from "@/lib/api/errors";
import { OTP_RETENTION_SECONDS } from "@/lib/constants";
import {
  failOrderCancel,
  finalizeOrderCancel,
  finalizeOrderCreation,
  getOrderRow,
  listOrderRows,
  markOrderNeedsReview,
  markOrderOtp,
  refundUnfilledOrder,
  requestOrderCancel,
  reserveOrder,
  reviewOrderCancel,
  setOrderTerminalStatus,
} from "@/lib/db/orders";
import { toPublicOrder } from "@/lib/orders/mapper";
import { canPollOtp, statusMessage } from "@/lib/orders/status";
import {
  cancelProviderOrder,
  checkProviderOtp,
  createProviderOrder,
  listCountries,
  listOperators,
  listServices,
} from "@/lib/provider/service";
import { ProviderError } from "@/lib/provider/types";
import { sha256 } from "@/lib/security/hash";
import { hasProviderConfig } from "@/lib/supabase/config";
import type { OrderStatus, PublicOrder } from "@/lib/types";

export interface PurchaseInput {
  countryId: number;
  serviceCode: string;
  operator: string;
}

export interface PurchaseResult {
  order: PublicOrder | null;
  duplicate: boolean;
  message: string;
}

export interface OtpCheckResult {
  order: PublicOrder;
  status: OrderStatus;
  otpCode: string | null;
  otpExpiresAt: string | null;
  message: string;
  shouldPoll: boolean;
}

export interface CancelResult {
  order: PublicOrder | null;
  status: OrderStatus;
  refundedAmountIdr: number;
  balanceIdr: number | null;
  message: string;
}

function providerErrorToAppError(error: ProviderError): AppError {
  if (error.kind === "config") {
    return new AppError("PROVIDER_NOT_CONFIGURED", error.message, 503);
  }
  if (error.kind === "rate_limited") {
    return new AppError("PROVIDER_RATE_LIMITED", error.message, 429, { retryAfter: 30 });
  }
  if (error.kind === "business") {
    return new AppError("PROVIDER_REJECTED", error.message, 409);
  }
  return new AppError("PROVIDER_RESULT_UNKNOWN", error.message, 503);
}

function isDefinitiveProviderFailure(error: ProviderError): boolean {
  return error.kind === "business" || error.kind === "config" || error.kind === "rate_limited";
}

async function orderView(userId: string, orderId: string, includeOtp = false): Promise<PublicOrder> {
  const row = await getOrderRow(userId, orderId);
  if (!row) throw new AppError("ORDER_NOT_FOUND", "Pesanan tidak ditemukan.", 404);
  return toPublicOrder(row, includeOtp);
}

export async function purchaseOrder(
  userId: string,
  input: PurchaseInput,
  idempotencyKey: string,
): Promise<PurchaseResult> {
  if (!hasProviderConfig()) {
    throw new AppError(
      "PROVIDER_NOT_CONFIGURED",
      "Kredensial penyedia belum dikonfigurasi. Hubungi administrator.",
      503,
    );
  }

  // Price, stock, country and operator are always re-read from the provider.
  const [countries, services, operators] = await Promise.all([
    listCountries({ fresh: true }),
    listServices(input.countryId, { fresh: true }),
    listOperators(input.countryId, { fresh: true }),
  ]);
  const country = countries.find((item) => item.id === input.countryId);
  if (!country) throw new AppError("INVALID_COUNTRY", "Negara tidak tersedia di penyedia.", 400);
  const service = services.find((item) => item.code === input.serviceCode);
  if (!service) throw new AppError("INVALID_SERVICE", "Layanan tidak tersedia untuk negara ini.", 400);
  if (service.stock <= 0) throw new AppError("OUT_OF_STOCK", "Stok nomor untuk layanan ini habis.", 409);
  const operator = operators.find(
    (item) => item.value.toLowerCase() === input.operator.trim().toLowerCase(),
  );
  if (!operator) throw new AppError("INVALID_OPERATOR", "Operator tidak tersedia untuk negara ini.", 400);

  const requestHash = sha256(
    [userId, country.id, service.code, service.name, operator.value, service.priceIdr].join("|"),
  );

  const reservation = await reserveOrder({
    userId,
    idempotencyKey,
    requestHash,
    countryId: country.id,
    countryName: country.name,
    serviceCode: service.code,
    serviceName: service.name,
    operator: operator.value,
    priceIdr: service.priceIdr,
  });

  if (reservation.outcome === "duplicate") {
    if (!reservation.orderId) {
      throw new AppError(
        "ORDER_IN_PROGRESS",
        "Permintaan pembelian sebelumnya masih diproses. Jangan klik dua kali.",
        409,
      );
    }
    return {
      order: await orderView(userId, reservation.orderId),
      duplicate: true,
      message: "Permintaan yang sama sudah diproses sebelumnya.",
    };
  }
  if (!reservation.orderId) {
    throw new AppError("ORDER_RESERVATION_FAILED", "Pesanan tidak dapat disiapkan.", 500);
  }
  const orderId = reservation.orderId;

  let providerOrder;
  try {
    providerOrder = await createProviderOrder({
      countryId: country.id,
      serviceCode: service.code,
      operator: operator.value,
    });
  } catch (error) {
    if (error instanceof ProviderError && isDefinitiveProviderFailure(error)) {
      await refundUnfilledOrder(orderId, `provider_${error.kind}`);
      throw providerErrorToAppError(error);
    }
    // Timeout / malformed response / network failure: the provider may have created the number.
    // Do NOT refund or retry automatically; freeze for human reconciliation.
    await markOrderNeedsReview(orderId, "provider_order_result_unknown");
    throw new AppError(
      "PROVIDER_RESULT_UNKNOWN",
      "Penyedia belum memberikan hasil yang dapat dipastikan. Pesanan ditandai untuk ditinjau; jangan ulangi pembelian. Hubungi dukungan.",
      503,
    );
  }

  try {
    await finalizeOrderCreation({
      orderId,
      providerOrderId: providerOrder.orderId,
      phoneNumber: providerOrder.phoneNumber,
      expiresAt: providerOrder.expiresAt,
    });
  } catch {
    // Provider order exists but could not be attached. Never expose the number without a DB record.
    await markOrderNeedsReview(orderId, "order_finalization_failed");
    throw new AppError(
      "ORDER_RECONCILIATION_REQUIRED",
      "Nomor berhasil dibuat di penyedia, tetapi data pesanan perlu ditinjau. Hubungi dukungan dan jangan membeli ulang.",
      503,
    );
  }

  return {
    order: await orderView(userId, orderId),
    duplicate: false,
    message: "Nomor berhasil dibuat. Pantau OTP pada halaman detail pesanan.",
  };
}

export async function getOrderDetail(userId: string, orderId: string): Promise<PublicOrder> {
  return orderView(userId, orderId, true);
}

export async function listOrders(
  userId: string,
  options: { limit?: number; status?: OrderStatus } = {},
): Promise<PublicOrder[]> {
  const rows = await listOrderRows(userId, options);
  return rows.map((row) => toPublicOrder(row, false));
}

export async function checkOrderOtp(userId: string, orderId: string): Promise<OtpCheckResult> {
  const initial = await orderView(userId, orderId, true);

  if (initial.status !== "waiting_otp") {
    let message = statusMessage(initial.status);
    if (initial.status === "otp_received" && !initial.otpCode) {
      message = "Kode OTP sudah dihapus setelah masa retensi 15 menit.";
    }
    if (initial.status === "cancel_pending") {
      message = "Pembatalan sedang diproses. Pemeriksaan OTP dijeda.";
    }
    return {
      order: initial,
      status: initial.status,
      otpCode: initial.otpCode,
      otpExpiresAt: initial.otpExpiresAt,
      message,
      shouldPoll: false,
    };
  }
  if (!initial.providerOrderId) {
    return {
      order: initial,
      status: initial.status,
      otpCode: null,
      otpExpiresAt: null,
      message: "ID pesanan penyedia belum tersedia. Hubungi dukungan.",
      shouldPoll: false,
    };
  }

  let result;
  try {
    result = await checkProviderOtp(initial.providerOrderId);
  } catch (error) {
    if (error instanceof ProviderError) throw providerErrorToAppError(error);
    throw new AppError("OTP_CHECK_FAILED", "Pemeriksaan OTP gagal. Coba lagi.", 502);
  }

  if (result.kind === "waiting") {
    return {
      order: initial,
      status: initial.status,
      otpCode: null,
      otpExpiresAt: null,
      message: result.message,
      shouldPoll: true,
    };
  }
  if (result.kind === "error") {
    throw new AppError("OTP_CHECK_REJECTED", result.message, 409);
  }
  if (result.kind === "terminal") {
    await setOrderTerminalStatus({
      orderId,
      userId,
      status: result.status,
      reasonCode: "provider_sms_terminal",
    });
    const updated = await orderView(userId, orderId, true);
    return {
      order: updated,
      status: updated.status,
      otpCode: null,
      otpExpiresAt: null,
      message: result.message,
      shouldPoll: false,
    };
  }

  const marked = await markOrderOtp({
    orderId,
    userId,
    code: result.code,
    ttlSeconds: OTP_RETENTION_SECONDS,
  });
  const updated = await orderView(userId, orderId, true);
  const code =
    marked.otp_code && typeof marked.otp_code === "string" ? marked.otp_code : updated.otpCode;
  return {
    order: updated,
    status: updated.status,
    otpCode: code,
    otpExpiresAt: updated.otpExpiresAt,
    message: code ? "Kode OTP diterima." : "Kode OTP belum dapat ditampilkan.",
    shouldPoll: false,
  };
}

export async function cancelUserOrder(
  userId: string,
  orderId: string,
  idempotencyKey: string,
): Promise<CancelResult> {
  const claim = await requestOrderCancel({ orderId, userId, idempotencyKey });
  if (claim.outcome === "in_progress") {
    throw new AppError(
      "CANCEL_IN_PROGRESS",
      "Pembatalan sedang diproses. Jangan kirim permintaan berulang.",
      409,
    );
  }
  if (claim.outcome === "already_final") {
    return {
      order: await orderView(userId, orderId, true),
      status: (claim.status ?? "cancelled") as OrderStatus,
      refundedAmountIdr: 0,
      balanceIdr: null,
      message: "Pesanan sudah memiliki status akhir; tidak ada pembatalan baru.",
    };
  }
  if (claim.outcome !== "claimed" || !claim.providerOrderId) {
    throw new AppError(
      "ORDER_NOT_CANCELLABLE",
      "Pesanan ini tidak dapat dibatalkan pada status saat ini.",
      409,
    );
  }

  let cancellation;
  try {
    cancellation = await cancelProviderOrder(claim.providerOrderId);
  } catch (error) {
    if (error instanceof ProviderError && isDefinitiveProviderFailure(error)) {
      await failOrderCancel({ orderId, userId, idempotencyKey, reasonCode: `provider_${error.kind}` });
      throw providerErrorToAppError(error);
    }
    // Timeout / malformed response: we cannot know whether the provider cancelled it.
    await reviewOrderCancel({
      orderId,
      userId,
      idempotencyKey,
      reasonCode: "provider_cancel_result_unknown",
    });
    throw new AppError(
      "CANCEL_RESULT_UNKNOWN",
      "Status pembatalan belum dapat dipastikan. Pesanan ditandai untuk ditinjau; jangan ulangi pembatalan. Hubungi dukungan.",
      503,
    );
  }

  try {
    const finalized = await finalizeOrderCancel({
      orderId,
      userId,
      idempotencyKey,
      refundedAmountIdr: cancellation.refundedAmountIdr,
    });
    return {
      order: await orderView(userId, orderId, true),
      status: "cancelled",
      refundedAmountIdr: finalized.refundedAmountIdr,
      balanceIdr: finalized.balanceIdr,
      message:
        finalized.refundedAmountIdr > 0
          ? "Pesanan dibatalkan dan refund resmi penyedia sudah masuk ke saldo."
          : "Pesanan dibatalkan. Penyedia mengonfirmasi refund Rp0.",
    };
  } catch {
    await markOrderNeedsReview(orderId, "cancel_refund_reconciliation_required");
    throw new AppError(
      "CANCEL_REFUND_REVIEW",
      "Penyedia mengonfirmasi pembatalan, tetapi refund perlu ditinjau. Jangan ulangi pembatalan.",
      503,
    );
  }
}

export function shouldPollOrder(status: OrderStatus): boolean {
  return canPollOtp(status);
}
