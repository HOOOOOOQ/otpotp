import type { OrderStatus } from "@/lib/types";

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; tone: "violet" | "cyan" | "green" | "amber" | "red" | "slate" }
> = {
  processing: {
    label: "Memproses",
    description: "Pesanan sedang dibuat di penyedia.",
    tone: "violet",
  },
  waiting_otp: {
    label: "Menunggu SMS",
    description: "Nomor aktif. Gunakan nomor ini pada aplikasi tujuan.",
    tone: "cyan",
  },
  otp_received: {
    label: "OTP diterima",
    description: "Kode OTP sudah tersedia.",
    tone: "green",
  },
  cancel_pending: {
    label: "Pembatalan diproses",
    description: "Konfirmasi pembatalan sedang menunggu penyedia.",
    tone: "amber",
  },
  cancelled: {
    label: "Dibatalkan",
    description: "Pesanan dibatalkan.",
    tone: "slate",
  },
  failed: {
    label: "Gagal",
    description: "Pesanan gagal dan saldo dikembalikan.",
    tone: "red",
  },
  expired: {
    label: "Kedaluwarsa",
    description: "Pesanan dinyatakan kedaluwarsa oleh penyedia.",
    tone: "amber",
  },
  needs_review: {
    label: "Perlu ditinjau",
    description: "Hasil operasi penyedia belum dapat dipastikan. Jangan ulangi permintaan.",
    tone: "amber",
  },
};

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  "otp_received",
  "cancelled",
  "failed",
  "expired",
  "needs_review",
];

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

export function canPollOtp(status: OrderStatus): boolean {
  return status === "waiting_otp";
}

export function canCancelOrder(status: OrderStatus): boolean {
  return status === "waiting_otp";
}

export function statusMessage(status: OrderStatus): string {
  return ORDER_STATUS_META[status]?.description ?? "Status pesanan tidak diketahui.";
}
