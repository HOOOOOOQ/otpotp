export const BRAND = {
  name: "Kaii OTP",
  legalName: "Kaii OTP",
  tagline: "Your Number. Your Code. Your Control.",
  description:
    "Platform penyewaan nomor virtual untuk menerima SMS OTP dengan harga transparan dan pemantauan pesanan yang jelas.",
} as const;

export const OTP_RETENTION_SECONDS = 15 * 60;
export const PROVIDER_TIMEOUT_MS = 10_000;
export const CATALOG_CACHE_SECONDS = 60;
export const LANDING_CACHE_SECONDS = 300;

export const ORDER_PAGE_SIZE = 100;
export const TRANSACTION_PAGE_SIZE = 100;
