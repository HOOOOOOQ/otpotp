import type { Country, Operator, ServiceItem } from "@/lib/types";
import { titleCase } from "@/lib/format";
import { isRecord, stripHtml, toRecord } from "@/lib/utils";
import {
  ProviderError,
  type ProviderBalanceResult,
  type ProviderCancelResult,
  type ProviderOrderResult,
  type ProviderOtpResult,
} from "@/lib/provider/types";

const GENERIC_PROVIDER_REJECTION = "Penyedia layanan menolak permintaan. Silakan coba lagi nanti.";
const GENERIC_INVALID_RESPONSE = "Respons penyedia tidak dapat diverifikasi. Silakan coba lagi nanti.";

export function isSuccessEnvelope(payload: unknown): boolean {
  const record = toRecord(payload);
  const value = record.success;
  return value === true || value === 1 || value === "true" || value === "1";
}

function normalizeMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = stripHtml(value).slice(0, 240);
  return clean.length > 0 ? clean : null;
}

/** Maps known provider phrases to safe user-facing messages. Never returns raw provider text. */
export function safeProviderMessage(value: unknown, fallback = GENERIC_PROVIDER_REJECTION): string {
  const text = normalizeMessage(value);
  if (!text) return fallback;
  const lower = text.toLowerCase();

  if (/api.?key|unauthorized|forbidden|auth/.test(lower)) {
    return "Kredensial penyedia ditolak. Hubungi administrator.";
  }
  if (/saldo|balance|insufficient/.test(lower)) {
    return "Saldo penyedia tidak mencukupi. Hubungi administrator.";
  }
  if (/stok|stock|habis|out of/.test(lower)) {
    return "Stok nomor untuk layanan ini sudah habis.";
  }
  if (/belum|menunggu|waiting|pending|no sms|no otp/.test(lower)) {
    return "SMS OTP belum tersedia. Pesanan masih menunggu.";
  }
  if (/dibatalkan|canceled|cancelled|already cancel/.test(lower)) {
    return "Pesanan sudah dibatalkan di penyedia.";
  }
  if (/expired|kedaluwarsa|kadaluarsa|habis waktu/.test(lower)) {
    return "Masa aktif pesanan di penyedia telah berakhir.";
  }
  if (/tidak ditemukan|not found|invalid order/.test(lower)) {
    return "Pesanan tidak ditemukan di penyedia.";
  }
  if (/operator/.test(lower) && /tidak|invalid/.test(lower)) {
    return "Operator yang dipilih tidak tersedia di penyedia.";
  }
  if (/layanan|service/.test(lower) && /tidak|invalid/.test(lower)) {
    return "Layanan yang dipilih tidak tersedia di penyedia.";
  }
  if (/terlalu banyak|rate limit|too many/.test(lower)) {
    return "Penyedia sedang membatasi permintaan. Coba lagi beberapa saat.";
  }
  return fallback;
}

function envelopeBusinessError(payload: unknown): ProviderError {
  const record = toRecord(payload);
  return new ProviderError(
    "business",
    safeProviderMessage(record.message ?? record.error, GENERIC_PROVIDER_REJECTION),
  );
}

function envelopeData(payload: unknown, fallbackMessage = GENERIC_INVALID_RESPONSE): unknown {
  if (!isRecord(payload) || !isSuccessEnvelope(payload)) {
    if (isRecord(payload) && "success" in payload) throw envelopeBusinessError(payload);
    throw new ProviderError("invalid_response", fallbackMessage);
  }
  return payload.data;
}

export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[^\d-]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const amount = Number(cleaned);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function parseId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

export function parseCountriesResponse(payload: unknown): Country[] {
  const data = envelopeData(payload, "Daftar negara penyedia tidak valid.");
  if (!Array.isArray(data)) {
    throw new ProviderError("invalid_response", "Daftar negara penyedia tidak valid.");
  }
  const byId = new Map<number, Country>();
  for (const item of data) {
    const record = toRecord(item);
    const id = parseId(record.id_negara ?? record.id ?? record.country_id);
    const name = normalizeMessage(record.nama_negara ?? record.name ?? record.country);
    if (id === null || !name) continue;
    byId.set(id, { id, name: titleCase(name.slice(0, 80)) });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

function looksLikeServiceDefinition(value: unknown): boolean {
  const record = toRecord(value);
  return (
    "harga" in record ||
    "price" in record ||
    "price_idr" in record ||
    "stok" in record ||
    "stock" in record
  );
}

function resolveServiceMap(payload: unknown, countryId: number): unknown {
  let candidate: unknown = payload;
  if (isRecord(candidate)) {
    if ("success" in candidate || "message" in candidate || "code" in candidate) {
      candidate = candidate.data;
    }
  }
  if (Array.isArray(candidate)) return candidate;
  let record = toRecord(candidate);
  if (isRecord(record[String(countryId)])) return record[String(countryId)];
  if (isRecord(record.data)) record = toRecord(record.data);
  if (isRecord(record[String(countryId)])) return record[String(countryId)];
  if (isRecord(record.layanan)) return record.layanan;
  if (isRecord(record.services)) return record.services;
  if (Object.values(record).some(looksLikeServiceDefinition)) return record;
  const numericKeys = Object.keys(record).filter((key) => /^\d+$/.test(key));
  if (numericKeys.length === 1 && isRecord(record[numericKeys[0]])) return record[numericKeys[0]];
  return null;
}

export function parseServicesResponse(payload: unknown, countryId: number): ServiceItem[] {
  if (isRecord(payload) && "success" in payload && !isSuccessEnvelope(payload)) {
    throw envelopeBusinessError(payload);
  }
  const map = resolveServiceMap(payload, countryId);
  if (!map) {
    throw new ProviderError("invalid_response", "Daftar layanan penyedia tidak valid.");
  }

  const entries: Array<[string, unknown]> = Array.isArray(map)
    ? map.map((item, index) => [String(index), item])
    : Object.entries(map);
  const services = new Map<string, ServiceItem>();

  for (const [key, value] of entries) {
    const record = toRecord(value);
    const rawCode = record.kode ?? record.code ?? record.service_code ?? record.id ?? key;
    const code = normalizeMessage(rawCode)?.slice(0, 80);
    const rawName = record.layanan ?? record.nama_layanan ?? record.name ?? record.service ?? code;
    const name = normalizeMessage(rawName)?.slice(0, 100);
    const priceIdr = parseMoney(record.harga ?? record.price ?? record.price_idr);
    const stock = parseMoney(record.stok ?? record.stock ?? record.available);
    if (!code || !name || priceIdr === null || stock === null) continue;
    if (!/^[a-zA-Z0-9_.-]+$/.test(code)) continue;
    services.set(code, { code, name: titleCase(name), priceIdr, stock });
  }

  return [...services.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

function parseOperatorValue(value: unknown): string | null {
  if (typeof value === "string") {
    const clean = stripHtml(value).slice(0, 80);
    return /^[a-zA-Z0-9_.\- ]+$/.test(clean) && clean.length > 0 ? clean : null;
  }
  const record = toRecord(value);
  const candidate = record.name ?? record.operator ?? record.value ?? record.code ?? record.id;
  return typeof candidate === "string" || typeof candidate === "number"
    ? parseOperatorValue(String(candidate))
    : null;
}

export function parseOperatorsResponse(payload: unknown, countryId: number): Operator[] {
  const data = envelopeData(payload, "Daftar operator penyedia tidak valid.");
  let values: unknown[] = [];
  if (Array.isArray(data)) {
    values = data;
  } else if (isRecord(data)) {
    const direct = data[String(countryId)] ?? data.operator ?? data.operators ?? data.data;
    if (Array.isArray(direct)) values = direct;
    else if (isRecord(direct)) {
      const nested = direct[String(countryId)] ?? direct.operator ?? direct.operators;
      if (Array.isArray(nested)) values = nested;
      else if (Object.keys(direct).length === 1) {
        const only = Object.values(direct)[0];
        if (Array.isArray(only)) values = only;
      }
    } else if (Object.keys(data).length === 1) {
      const only = Object.values(data)[0];
      if (Array.isArray(only)) values = only;
    }
  }

  const byValue = new Map<string, Operator>();
  for (const item of values) {
    const value = parseOperatorValue(item);
    if (!value) continue;
    const key = value.toLowerCase();
    if (!byValue.has(key)) byValue.set(key, { value, label: titleCase(value) });
  }
  return [...byValue.values()].sort((a, b) => {
    if (a.value.toLowerCase() === "any") return -1;
    if (b.value.toLowerCase() === "any") return 1;
    return a.label.localeCompare(b.label, "id");
  });
}

function parseOptionalExpiry(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const timestamp = value > 1e12 ? value : value * 1000;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (/^\d{10}$|^\d{13}$/.test(text)) return parseOptionalExpiry(Number(text));
  if (!/^\d{4}-\d{2}-\d{2}T/i.test(text)) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parsePhoneNumber(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const clean = String(value).trim();
  if (!/^\+?[0-9][0-9 ()-]{4,24}$/.test(clean)) return null;
  return clean.slice(0, 32);
}

export function parseOrderResponse(payload: unknown): ProviderOrderResult {
  const data = envelopeData(payload, "Respons pembuatan pesanan penyedia tidak valid.");
  const record = toRecord(data);
  const orderIdValue = record.order_id ?? record.id ?? record.id_order;
  const orderId =
    typeof orderIdValue === "number" && Number.isSafeInteger(orderIdValue) && orderIdValue > 0
      ? String(orderIdValue)
      : typeof orderIdValue === "string" && /^\d{1,20}$/.test(orderIdValue.trim())
        ? orderIdValue.trim()
        : null;
  const phoneNumber = parsePhoneNumber(record.number ?? record.nomor ?? record.phone_number);
  if (!orderId || !phoneNumber) {
    throw new ProviderError(
      "invalid_response",
      "Pesanan penyedia belum memiliki nomor atau ID yang valid.",
    );
  }
  const expiresAt = parseOptionalExpiry(
    record.expires_at ?? record.expired_at ?? record.valid_until ?? record.expire_at,
  );
  return { orderId, phoneNumber, expiresAt };
}

const OTP_FIELDS = new Set([
  "otp",
  "otp_code",
  "kode_otp",
  "code",
  "sms_code",
  "kode",
  "sms",
  "pesan",
  "message",
  "text",
  "full_sms",
  "isi_sms",
]);

function isPendingText(value: string): boolean {
  return /^(?:-|null|none|undefined|menunggu|waiting|pending|belum|no sms|no otp|kosong)$/i.test(
    value.trim(),
  ) || /belum (?:ada|tersedia|masuk)|menunggu sms|waiting (?:for )?(?:sms|otp)|no (?:sms|otp) yet/i.test(value);
}

function directOtpCandidate(value: string): string | null {
  const clean = stripHtml(value)
    .replace(/^(?:kode|otp|code|your code is|kode anda)\s*[:#\-]?\s*/i, "")
    .trim();
  if (!clean || isPendingText(clean)) return null;
  if (/^[A-Za-z0-9][A-Za-z0-9 -]{2,31}$/.test(clean) && /\d{3,}/.test(clean)) return clean;
  return null;
}

function otpFromMessage(value: string): string | null {
  const clean = stripHtml(value);
  if (isPendingText(clean)) return null;
  const matches = clean.match(/(?:G[-\s]?)?\d(?:[\s-]?\d){2,9}/g) ?? [];
  const codes = matches
    .map((match) => ({ raw: match.trim(), digits: match.replace(/\D/g, "") }))
    .filter(({ digits }) => digits.length >= 3 && digits.length <= 10)
    .sort((a, b) => b.digits.length - a.digits.length);
  return codes[0]?.raw ?? null;
}

/** Extracts only the code, never the whole SMS/provider response. */
export function extractOtpCode(value: unknown): string | null {
  if (typeof value === "number") {
    const text = String(value);
    return /^\d{3,10}$/.test(text) ? text : null;
  }
  if (typeof value !== "string") return null;
  return directOtpCandidate(value) ?? otpFromMessage(value);
}

function collectOtpCandidates(value: unknown, depth = 0): string[] {
  if (depth > 4) return [];
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap((item) => collectOtpCandidates(item, depth + 1));
  if (!isRecord(value)) return [];
  const result: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    if (OTP_FIELDS.has(key.toLowerCase())) result.push(...collectOtpCandidates(child, depth + 1));
  }
  return result;
}

function detectTerminalStatus(payload: unknown): ProviderOtpResult | null {
  const root = toRecord(payload);
  const data = toRecord(root.data);
  const texts = [
    root.status,
    root.state,
    root.message,
    root.error,
    data.status,
    data.state,
    data.message,
    data.error,
    data.keterangan,
  ]
    .map(normalizeMessage)
    .filter((value): value is string => value !== null);
  const combined = texts.join(" ").toLowerCase();
  if (/dibatalkan|canceled|cancelled/.test(combined)) {
    return { kind: "terminal", status: "cancelled", message: "Penyedia melaporkan pesanan dibatalkan." };
  }
  if (/expired|kedaluwarsa|kadaluarsa/.test(combined)) {
    return { kind: "terminal", status: "expired", message: "Penyedia melaporkan pesanan kedaluwarsa." };
  }
  if (/tidak ditemukan|not found|invalid order|order not found/.test(combined)) {
    return {
      kind: "terminal",
      status: "needs_review",
      message: "Penyedia tidak lagi menemukan pesanan ini. Hubungi dukungan untuk peninjauan.",
    };
  }
  return null;
}

export function parseOtpResponse(payload: unknown): ProviderOtpResult {
  if (!isRecord(payload)) {
    return { kind: "error", message: "Respons OTP penyedia tidak dapat dibaca." };
  }
  const pendingMessage = safeProviderMessage(
    payload.message ?? payload.error,
    "SMS OTP belum tersedia. Pesanan masih menunggu.",
  );
  if (!isSuccessEnvelope(payload)) {
    if (isPendingText(String(payload.message ?? payload.error ?? "")) || /belum|menunggu|waiting|pending/i.test(pendingMessage)) {
      return { kind: "waiting", message: "SMS OTP belum tersedia. Pesanan masih menunggu." };
    }
    const terminal = detectTerminalStatus(payload);
    if (terminal) return terminal;
    return { kind: "error", message: safeProviderMessage(payload.message ?? payload.error) };
  }

  const terminal = detectTerminalStatus(payload);
  if (terminal) return terminal;

  const candidates = collectOtpCandidates(payload.data);
  for (const candidate of candidates) {
    const code = extractOtpCode(candidate);
    if (code) return { kind: "received", code: code.slice(0, 40) };
  }
  return { kind: "waiting", message: "SMS OTP belum tersedia. Pesanan masih menunggu." };
}

export function parseCancelResponse(payload: unknown): ProviderCancelResult {
  const data = envelopeData(payload, "Konfirmasi pembatalan penyedia tidak valid.");
  const record = toRecord(data);
  const refundedAmountIdr = parseMoney(record.refunded_amount ?? record.refund ?? record.amount);
  if (refundedAmountIdr === null) {
    throw new ProviderError(
      "invalid_response",
      "Penyedia belum mengonfirmasi nominal refund. Saldo belum diubah.",
    );
  }
  const rawId = record.order_id ?? record.id;
  const orderId =
    rawId === undefined || rawId === null
      ? null
      : typeof rawId === "string" || typeof rawId === "number"
        ? String(rawId).slice(0, 40)
        : null;
  return { orderId, refundedAmountIdr };
}

export function parseBalanceResponse(payload: unknown): ProviderBalanceResult {
  const data = envelopeData(payload, "Respons saldo penyedia tidak valid.");
  const record = toRecord(data);
  const amount = parseMoney(record.saldo ?? record.balance ?? record.amount);
  if (amount === null) {
    throw new ProviderError("invalid_response", "Nominal saldo penyedia tidak valid.");
  }
  return {
    amount,
    currency: "IDR",
    note: "Harga layanan penyedia menggunakan Rupiah. Dokumentasi saldo tidak menyertakan field mata uang.",
  };
}
