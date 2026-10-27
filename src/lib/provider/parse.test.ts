import { describe, expect, it } from "vitest";
import {
  extractOtpCode,
  parseBalanceResponse,
  parseCancelResponse,
  parseCountriesResponse,
  parseOperatorsResponse,
  parseOrderResponse,
  parseOtpResponse,
  parseServicesResponse,
  safeProviderMessage,
} from "@/lib/provider/parse";
import { ProviderError } from "@/lib/provider/types";

const countriesPayload = {
  code: 200,
  success: true,
  message: "Berhasil mengambil daftar negara.",
  data: [
    { id_negara: 6, nama_negara: "indonesia" },
    { id_negara: 0, nama_negara: "rusia" },
  ],
};

const servicesPayload = {
  "6": {
    wa: { harga: 3000, stok: 999, layanan: "whatsapp" },
    fb: { harga: 4000, stok: 0, layanan: "facebook" },
  },
};

const operatorsPayload = {
  code: 200,
  success: true,
  message: "Berhasil mendapatkan daftar operator.",
  data: { "6": ["telkomsel", "any", "indosat"] },
};

describe("provider response parsers", () => {
  it("parses countries from a valid success envelope", () => {
    const countries = parseCountriesResponse(countriesPayload);
    expect(countries).toEqual([
      { id: 6, name: "Indonesia" },
      { id: 0, name: "Rusia" },
    ]);
  });

  it("returns an empty list instead of inventing countries", () => {
    expect(parseCountriesResponse({ success: true, data: [] })).toEqual([]);
  });

  it("rejects a country response with success false", () => {
    expect(() => parseCountriesResponse({ success: false, message: "Gagal" })).toThrow(ProviderError);
  });

  it("parses the documented country-keyed service map and keeps real stock", () => {
    const services = parseServicesResponse(servicesPayload, 6);
    expect(services).toHaveLength(2);
    expect(services.find((item) => item.code === "wa")).toEqual({
      code: "wa",
      name: "Whatsapp",
      priceIdr: 3000,
      stock: 999,
    });
    expect(services.find((item) => item.code === "fb")?.stock).toBe(0);
  });

  it("puts provider-supplied 'any' first without inventing it", () => {
    const operators = parseOperatorsResponse(operatorsPayload, 6);
    expect(operators[0].value).toBe("any");
    expect(operators.map((item) => item.value)).toEqual(["any", "indosat", "telkomsel"]);
    expect(operators.map((item) => item.label)).toEqual(["Any", "Indosat", "Telkomsel"]);
    expect(parseOperatorsResponse({ success: true, data: { "6": [] } }, 6)).toEqual([]);
  });

  it("requires success, order_id and number before accepting an order", () => {
    expect(
      parseOrderResponse({
        success: true,
        data: { order_id: 1728868, number: "+6282272111384" },
      }),
    ).toEqual({ orderId: "1728868", phoneNumber: "+6282272111384", expiresAt: null });

    expect(() =>
      parseOrderResponse({ success: false, message: "Stok habis", data: { order_id: 1 } }),
    ).toThrow(/stok/i);
    expect(() =>
      parseOrderResponse({ code: 200, success: true, data: { order_id: 1 } }),
    ).toThrow(ProviderError);
  });

  it("stores provider expiry only when it is an unambiguous timestamp", () => {
    const result = parseOrderResponse({
      success: true,
      data: { order_id: 5, number: "+62812345678", expired_at: "2026-10-27T10:00:00.000Z" },
    });
    expect(result.expiresAt).toBe("2026-10-27T10:00:00.000Z");
    const noExpiry = parseOrderResponse({
      success: true,
      data: { order_id: 6, number: "+62812345679", expired_at: "sebentar lagi" },
    });
    expect(noExpiry.expiresAt).toBeNull();
  });

  it("extracts only the OTP code, not the whole SMS response", () => {
    expect(parseOtpResponse({ success: true, data: { otp: "123456" } })).toEqual({
      kind: "received",
      code: "123456",
    });
    expect(extractOtpCode("Your WhatsApp code is 938-271. Do not share it.")).toBe("938-271");
    expect(extractOtpCode("Belum ada SMS")).toBeNull();
  });

  it("treats a pending provider response as waiting", () => {
    const result = parseOtpResponse({ success: false, message: "OTP belum masuk" });
    expect(result.kind).toBe("waiting");
    expect(parseOtpResponse({ success: true, data: { otp: null } }).kind).toBe("waiting");
  });

  it("recognizes terminal provider status without exposing raw payload", () => {
    const result = parseOtpResponse({ success: false, message: "Pesanan telah dibatalkan" });
    expect(result).toMatchObject({ kind: "terminal", status: "cancelled" });
    if (result.kind === "terminal") expect(result.message).not.toContain("api_key");
  });

  it("requires an official refunded_amount before confirming cancellation", () => {
    expect(
      parseCancelResponse({
        success: true,
        data: { order_id: 1728868, refunded_amount: 3000 },
      }),
    ).toEqual({ orderId: "1728868", refundedAmountIdr: 3000 });
    expect(() => parseCancelResponse({ success: true, data: { order_id: 1 } })).toThrow(
      ProviderError,
    );
  });

  it("parses provider balance as IDR", () => {
    expect(parseBalanceResponse({ success: true, data: { saldo: 10000 } })).toMatchObject({
      amount: 10000,
      currency: "IDR",
    });
    expect(() => parseBalanceResponse({ success: true, data: {} })).toThrow(ProviderError);
  });

  it("never forwards raw provider secrets in error messages", () => {
    const message = safeProviderMessage("Invalid api_key=SECRET_123 with otp 123456");
    expect(message).not.toContain("SECRET_123");
    expect(message).not.toContain("123456");
    expect(message).toMatch(/kredensial/i);
  });
});
