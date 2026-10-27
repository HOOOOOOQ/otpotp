import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderRow } from "@/lib/db/types";
import { ProviderError } from "@/lib/provider/types";

vi.mock("@/lib/provider/service", () => ({
  listCountries: vi.fn(),
  listServices: vi.fn(),
  listOperators: vi.fn(),
  createProviderOrder: vi.fn(),
  checkProviderOtp: vi.fn(),
  cancelProviderOrder: vi.fn(),
}));

vi.mock("@/lib/db/orders", () => ({
  failOrderCancel: vi.fn(),
  finalizeOrderCancel: vi.fn(),
  finalizeOrderCreation: vi.fn(),
  getOrderRow: vi.fn(),
  listOrderRows: vi.fn(),
  markOrderNeedsReview: vi.fn(),
  markOrderOtp: vi.fn(),
  refundUnfilledOrder: vi.fn(),
  requestOrderCancel: vi.fn(),
  reserveOrder: vi.fn(),
  reviewOrderCancel: vi.fn(),
  setOrderTerminalStatus: vi.fn(),
}));

vi.mock("@/lib/security/hash", () => ({ sha256: vi.fn(() => "request-hash") }));
vi.mock("@/lib/supabase/config", () => ({ hasProviderConfig: vi.fn(() => true) }));

import { failOrderCancel, finalizeOrderCancel, finalizeOrderCreation, getOrderRow, markOrderNeedsReview, markOrderOtp, refundUnfilledOrder, requestOrderCancel, reserveOrder, reviewOrderCancel, setOrderTerminalStatus } from "@/lib/db/orders";
import { checkOrderOtp, cancelUserOrder, purchaseOrder } from "@/lib/orders/service";
import { cancelProviderOrder, checkProviderOtp, createProviderOrder, listCountries, listOperators, listServices } from "@/lib/provider/service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";

function makeOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: ORDER_ID,
    user_id: USER_ID,
    provider_order_id: "1728868",
    phone_number: "+6282272111384",
    country_id: 6,
    country_name: "Indonesia",
    service_code: "wa",
    service_name: "Whatsapp",
    operator: "any",
    price_idr: 3000,
    status: "waiting_otp",
    otp_code: null,
    otp_expires_at: null,
    otp_received_at: null,
    provider_expires_at: null,
    cancel_pending_at: null,
    cancel_idempotency_key: null,
    provider_error_code: null,
    created_at: "2026-10-27T08:00:00.000Z",
    updated_at: "2026-10-27T08:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listCountries).mockResolvedValue([{ id: 6, name: "Indonesia" }]);
  vi.mocked(listServices).mockResolvedValue([
    { code: "wa", name: "Whatsapp", priceIdr: 3000, stock: 999 },
  ]);
  vi.mocked(listOperators).mockResolvedValue([{ value: "any", label: "Any" }]);
  vi.mocked(reserveOrder).mockResolvedValue({
    outcome: "reserved",
    orderId: ORDER_ID,
    status: "processing",
    balanceIdr: 7000,
  });
  vi.mocked(createProviderOrder).mockResolvedValue({
    orderId: "1728868",
    phoneNumber: "+6282272111384",
    expiresAt: null,
  });
  vi.mocked(finalizeOrderCreation).mockResolvedValue(undefined);
  vi.mocked(refundUnfilledOrder).mockResolvedValue(undefined);
  vi.mocked(markOrderNeedsReview).mockResolvedValue(undefined);
  vi.mocked(failOrderCancel).mockResolvedValue(undefined);
  vi.mocked(reviewOrderCancel).mockResolvedValue(undefined);
  vi.mocked(setOrderTerminalStatus).mockResolvedValue(undefined);
  vi.mocked(getOrderRow).mockResolvedValue(makeOrderRow());
});

const purchaseInput = { countryId: 6, serviceCode: "wa", operator: "any" };

describe("purchase flow", () => {
  it("revalidates provider price, debits atomically, creates the provider order, and returns the user's order", async () => {
    const result = await purchaseOrder(USER_ID, purchaseInput, "purchase-key-123456");
    expect(reserveOrder).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, priceIdr: 3000, operator: "any" }),
    );
    expect(createProviderOrder).toHaveBeenCalledWith({
      countryId: 6,
      serviceCode: "wa",
      operator: "any",
    });
    expect(finalizeOrderCreation).toHaveBeenCalledWith({
      orderId: ORDER_ID,
      providerOrderId: "1728868",
      phoneNumber: "+6282272111384",
      expiresAt: null,
    });
    expect(result.order?.status).toBe("waiting_otp");
    expect(result.duplicate).toBe(false);
  });

  it("refunds the debit only when the provider definitively rejects the order", async () => {
    vi.mocked(createProviderOrder).mockRejectedValueOnce(
      new ProviderError("business", "Stok nomor untuk layanan ini sudah habis."),
    );
    await expect(purchaseOrder(USER_ID, purchaseInput, "purchase-key-definitive")).rejects.toMatchObject({
      code: "PROVIDER_REJECTED",
    });
    expect(refundUnfilledOrder).toHaveBeenCalledTimes(1);
    expect(markOrderNeedsReview).not.toHaveBeenCalled();
    expect(finalizeOrderCreation).not.toHaveBeenCalled();
  });

  it("does not refund or retry when a timeout leaves the provider result unknown", async () => {
    vi.mocked(createProviderOrder).mockRejectedValueOnce(
      new ProviderError("transport", "Penyedia tidak merespons tepat waktu."),
    );
    await expect(purchaseOrder(USER_ID, purchaseInput, "purchase-key-timeout")).rejects.toMatchObject({
      code: "PROVIDER_RESULT_UNKNOWN",
    });
    expect(refundUnfilledOrder).not.toHaveBeenCalled();
    expect(markOrderNeedsReview).toHaveBeenCalledWith(ORDER_ID, "provider_order_result_unknown");
  });

  it("returns an existing order for a duplicate idempotency key without a second provider order", async () => {
    vi.mocked(reserveOrder).mockResolvedValueOnce({
      outcome: "duplicate",
      orderId: ORDER_ID,
      status: "waiting_otp",
      balanceIdr: 7000,
    });
    const result = await purchaseOrder(USER_ID, purchaseInput, "purchase-key-duplicate");
    expect(result.duplicate).toBe(true);
    expect(createProviderOrder).not.toHaveBeenCalled();
  });

  it("rejects a service whose provider stock is zero", async () => {
    vi.mocked(listServices).mockResolvedValueOnce([
      { code: "wa", name: "Whatsapp", priceIdr: 3000, stock: 0 },
    ]);
    await expect(purchaseOrder(USER_ID, purchaseInput, "purchase-key-stock")).rejects.toMatchObject({
      code: "OUT_OF_STOCK",
    });
    expect(reserveOrder).not.toHaveBeenCalled();
  });
});

describe("OTP flow", () => {
  it("polls and stores only the parsed OTP code, then stops", async () => {
    vi.mocked(checkProviderOtp).mockResolvedValueOnce({ kind: "received", code: "839201" });
    vi.mocked(markOrderOtp).mockResolvedValueOnce({
      outcome: "received",
      otp_code: "839201",
      status: "otp_received",
    });
    vi.mocked(getOrderRow)
      .mockResolvedValueOnce(makeOrderRow())
      .mockResolvedValueOnce(makeOrderRow({ status: "otp_received", otp_code: "839201" }));

    const result = await checkOrderOtp(USER_ID, ORDER_ID);
    expect(checkProviderOtp).toHaveBeenCalledWith("1728868");
    expect(markOrderOtp).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, code: "839201" }),
    );
    expect(result.otpCode).toBe("839201");
    expect(result.status).toBe("otp_received");
    expect(result.shouldPoll).toBe(false);
  });

  it("keeps polling while SMS is pending", async () => {
    vi.mocked(checkProviderOtp).mockResolvedValueOnce({
      kind: "waiting",
      message: "SMS OTP belum tersedia.",
    });
    const result = await checkOrderOtp(USER_ID, ORDER_ID);
    expect(result.shouldPoll).toBe(true);
    expect(result.otpCode).toBeNull();
    expect(markOrderOtp).not.toHaveBeenCalled();
  });

  it("stops polling when the provider reports a terminal status", async () => {
    vi.mocked(checkProviderOtp).mockResolvedValueOnce({
      kind: "terminal",
      status: "cancelled",
      message: "Penyedia melaporkan pesanan dibatalkan.",
    });
    vi.mocked(getOrderRow)
      .mockResolvedValueOnce(makeOrderRow())
      .mockResolvedValueOnce(makeOrderRow({ status: "cancelled" }));
    const result = await checkOrderOtp(USER_ID, ORDER_ID);
    expect(setOrderTerminalStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled", userId: USER_ID }),
    );
    expect(result.status).toBe("cancelled");
    expect(result.shouldPoll).toBe(false);
  });

  it("does not call the provider for another user's/nonexistent order", async () => {
    vi.mocked(getOrderRow).mockResolvedValueOnce(null);
    await expect(checkOrderOtp(USER_ID, ORDER_ID)).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
    });
    expect(checkProviderOtp).not.toHaveBeenCalled();
  });
});

describe("cancellation flow", () => {
  it("credits the user's wallet only after the provider confirms the official refund", async () => {
    vi.mocked(requestOrderCancel).mockResolvedValueOnce({
      outcome: "claimed",
      status: "cancel_pending",
      providerOrderId: "1728868",
    });
    vi.mocked(cancelProviderOrder).mockResolvedValueOnce({
      orderId: "1728868",
      refundedAmountIdr: 3000,
    });
    vi.mocked(finalizeOrderCancel).mockResolvedValueOnce({
      refundedAmountIdr: 3000,
      balanceIdr: 10000,
    });
    vi.mocked(getOrderRow).mockResolvedValueOnce(makeOrderRow({ status: "cancelled" }));

    const result = await cancelUserOrder(USER_ID, ORDER_ID, "cancel-key-confirmed-123");
    expect(cancelProviderOrder).toHaveBeenCalledWith("1728868");
    expect(finalizeOrderCancel).toHaveBeenCalledWith(
      expect.objectContaining({ refundedAmountIdr: 3000, userId: USER_ID }),
    );
    expect(result.status).toBe("cancelled");
    expect(result.refundedAmountIdr).toBe(3000);
  });

  it("blocks a second cancellation while one is in progress", async () => {
    vi.mocked(requestOrderCancel).mockResolvedValueOnce({
      outcome: "in_progress",
      status: "cancel_pending",
      providerOrderId: null,
    });
    await expect(cancelUserOrder(USER_ID, ORDER_ID, "cancel-key-in-progress")).rejects.toMatchObject({
      code: "CANCEL_IN_PROGRESS",
    });
    expect(cancelProviderOrder).not.toHaveBeenCalled();
    expect(finalizeOrderCancel).not.toHaveBeenCalled();
  });

  it("freezes the order for review when cancellation times out", async () => {
    vi.mocked(requestOrderCancel).mockResolvedValueOnce({
      outcome: "claimed",
      status: "cancel_pending",
      providerOrderId: "1728868",
    });
    vi.mocked(cancelProviderOrder).mockRejectedValueOnce(
      new ProviderError("transport", "Penyedia tidak merespons tepat waktu."),
    );
    await expect(cancelUserOrder(USER_ID, ORDER_ID, "cancel-key-timeout")).rejects.toMatchObject({
      code: "CANCEL_RESULT_UNKNOWN",
    });
    expect(reviewOrderCancel).toHaveBeenCalledTimes(1);
    expect(finalizeOrderCancel).not.toHaveBeenCalled();
    expect(failOrderCancel).not.toHaveBeenCalled();
  });
});
