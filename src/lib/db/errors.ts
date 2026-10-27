import { AppError } from "@/lib/api/errors";

const KNOWN_CODES = [
  "INSUFFICIENT_BALANCE",
  "IDEMPOTENCY_CONFLICT",
  "ORDER_NOT_FOUND",
  "PROFILE_NOT_FOUND",
  "ORDER_NOT_PROCESSING",
  "INVALID_CANCEL_STATE",
  "INVALID_REFUND_AMOUNT",
  "INVALID_STATUS",
  "INVALID_PRICE",
  "DEPOSIT_NOT_FOUND",
  "FORBIDDEN",
] as const;

type KnownCode = (typeof KNOWN_CODES)[number];

const ERROR_MAP: Record<KnownCode, { status: number; message: string }> = {
  INSUFFICIENT_BALANCE: {
    status: 402,
    message: "Saldo tidak mencukupi. Lakukan deposit dan tunggu verifikasi admin.",
  },
  IDEMPOTENCY_CONFLICT: {
    status: 409,
    message: "Kunci permintaan sudah digunakan untuk data yang berbeda. Muat ulang halaman.",
  },
  ORDER_NOT_FOUND: { status: 404, message: "Pesanan tidak ditemukan." },
  PROFILE_NOT_FOUND: { status: 404, message: "Profil pengguna tidak ditemukan." },
  ORDER_NOT_PROCESSING: {
    status: 409,
    message: "Status pesanan sudah berubah. Muat ulang halaman.",
  },
  INVALID_CANCEL_STATE: {
    status: 409,
    message: "Pembatalan tidak dapat diselesaikan karena status pesanan berubah.",
  },
  INVALID_REFUND_AMOUNT: {
    status: 502,
    message: "Nominal refund penyedia tidak valid. Saldo belum diubah.",
  },
  INVALID_STATUS: { status: 400, message: "Status pesanan tidak valid." },
  INVALID_PRICE: { status: 400, message: "Harga layanan tidak valid." },
  DEPOSIT_NOT_FOUND: { status: 404, message: "Permintaan deposit tidak ditemukan." },
  FORBIDDEN: { status: 403, message: "Akses ditolak." },
};

export function mapDatabaseError(error: { message?: string; code?: string }): AppError {
  const message = error.message ?? "";
  const matched = KNOWN_CODES.find((code) => message.includes(code));
  if (matched) {
    const mapped = ERROR_MAP[matched];
    return new AppError(matched, mapped.message, mapped.status);
  }
  return new AppError("DATABASE_ERROR", "Data tidak dapat diproses. Coba lagi beberapa saat.", 500);
}
