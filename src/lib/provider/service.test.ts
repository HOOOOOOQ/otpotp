import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/provider/types";
import {
  cancelProviderOrder,
  checkProviderOtp,
  createProviderOrder,
  getLandingStats,
  getProviderBalance,
  listCountries,
  listOperators,
  listServices,
} from "@/lib/provider/service";

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
    ig: { harga: 2500, stok: 12, layanan: "instagram" },
  },
};

const operatorsPayload = {
  code: 200,
  success: true,
  message: "Berhasil mendapatkan daftar operator.",
  data: { "6": ["any", "telkomsel", "indosat"] },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function urlAt(callIndex: number): URL {
  const call = fetchMock.mock.calls[callIndex];
  return new URL(String(call?.[0]));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("JASAOTP_API_KEY", "server-test-key");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("JasaOTP v2 server proxy", () => {
  it("uses fixed v2 endpoints and never adds api_key to public catalog calls", async () => {
    fetchMock
      .mockResolvedValueOnce(json(countriesPayload))
      .mockResolvedValueOnce(json(servicesPayload))
      .mockResolvedValueOnce(json(operatorsPayload));

    const countries = await listCountries({ fresh: true });
    const services = await listServices(6, { fresh: true });
    const operators = await listOperators(6, { fresh: true });

    expect(countries).toHaveLength(2);
    expect(services.find((item) => item.code === "wa")?.priceIdr).toBe(3000);
    expect(operators[0].value).toBe("any");
    expect(urlAt(0).href).toContain("https://api.jasaotp.id/v2/negara.php");
    expect(urlAt(1).href).toContain("https://api.jasaotp.id/v2/layanan.php?negara=6");
    expect(urlAt(2).href).toContain("https://api.jasaotp.id/v2/operator.php?negara=6");
    for (const index of [0, 1, 2]) {
      expect(urlAt(index).searchParams.has("api_key")).toBe(false);
    }
  });

  it("reads provider balance with the server-side API key and returns IDR", async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, data: { saldo: 10000 } }));
    const balance = await getProviderBalance();
    expect(balance).toMatchObject({ amount: 10000, currency: "IDR" });
    expect(urlAt(0).pathname).toBe("/v2/balance.php");
    expect(urlAt(0).searchParams.get("api_key")).toBe("server-test-key");
    expect(urlAt(0).searchParams.getAll("api_key")).toHaveLength(1);
  });

  it("creates an order with provider-validated parameters and validates success", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ success: true, data: { order_id: 1728868, number: "+6282272111384" } }),
    );
    const order = await createProviderOrder({ countryId: 6, serviceCode: "wa", operator: "any" });
    expect(order).toEqual({ orderId: "1728868", phoneNumber: "+6282272111384", expiresAt: null });
    expect(urlAt(0).pathname).toBe("/v2/order.php");
    expect(urlAt(0).searchParams.get("api_key")).toBe("server-test-key");
    expect(urlAt(0).searchParams.get("negara")).toBe("6");
    expect(urlAt(0).searchParams.get("layanan")).toBe("wa");
    expect(urlAt(0).searchParams.get("operator")).toBe("any");

    fetchMock.mockResolvedValueOnce(
      json({ code: 200, success: false, message: "Stok habis" }, 200),
    );
    await expect(
      createProviderOrder({ countryId: 6, serviceCode: "wa", operator: "any" }),
    ).rejects.toMatchObject({ kind: "business" });
  });

  it("checks OTP for both waiting and received states", async () => {
    fetchMock.mockResolvedValueOnce(json({ success: false, message: "OTP belum masuk" }));
    const waiting = await checkProviderOtp("1728868");
    expect(waiting.kind).toBe("waiting");
    expect(urlAt(0).pathname).toBe("/v2/sms.php");
    expect(urlAt(0).searchParams.get("id")).toBe("1728868");

    fetchMock.mockResolvedValueOnce(json({ success: true, data: { otp: "483920" } }));
    const received = await checkProviderOtp("1728868");
    expect(received).toEqual({ kind: "received", code: "483920" });
  });

  it("cancels an order and requires the official refund amount", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ success: true, data: { order_id: 1728868, refunded_amount: 3000 } }),
    );
    const result = await cancelProviderOrder("1728868");
    expect(result.refundedAmountIdr).toBe(3000);
    expect(urlAt(0).pathname).toBe("/v2/cancel.php");
    expect(urlAt(0).searchParams.get("api_key")).toBe("server-test-key");

    fetchMock.mockResolvedValueOnce(json({ success: true, data: { order_id: 1728868 } }));
    await expect(cancelProviderOrder("1728868")).rejects.toBeInstanceOf(ProviderError);
  });

  it("classifies transport failures as uncertain and never leaks the key in the message", async () => {
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"));
    await expect(
      createProviderOrder({ countryId: 6, serviceCode: "wa", operator: "any" }),
    ).rejects.toMatchObject({ kind: "transport" });
    fetchMock.mockResolvedValueOnce(new Response("<html>upstream error</html>", { status: 500 }));
    const error = await getProviderBalance().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).message).not.toContain("server-test-key");
    expect((error as ProviderError).kind).toBe("transport");
  });

  it("computes landing statistics from live provider responses", async () => {
    fetchMock.mockImplementation((input: unknown) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("negara.php")) return Promise.resolve(json(countriesPayload));
      if (url.pathname.endsWith("layanan.php")) return Promise.resolve(json(servicesPayload));
      if (url.pathname.endsWith("operator.php")) return Promise.resolve(json(operatorsPayload));
      return Promise.resolve(new Response("not found", { status: 404 }));
    });
    const stats = await getLandingStats({ fresh: true });
    expect(stats.available).toBe(true);
    expect(stats.countries).toBe(2);
    expect(stats.services).toBe(3);
    expect(stats.operators).toBe(3);
    expect(stats.lowestPriceIdr).toBe(2500);
    expect(stats.featuredServices[0].code).toBe("ig");
    expect(stats.sampleCountry?.id).toBe(6);
    for (const call of fetchMock.mock.calls) {
      expect(new URL(String(call[0])).searchParams.has("api_key")).toBe(false);
    }
  });
});
