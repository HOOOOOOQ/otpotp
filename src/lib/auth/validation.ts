import { z } from "zod";

const password = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.")
  .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
  .regex(/[0-9]/, "Kata sandi harus memuat angka.");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Alamat email tidak valid.").max(180),
  password: z.string().min(1, "Kata sandi wajib diisi.").max(72),
  next: z.string().max(200).optional(),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  email: z.string().trim().toLowerCase().email("Alamat email tidak valid.").max(180),
  password,
  next: z.string().max(200).optional(),
});

export const orderSchema = z.object({
  negara: z.coerce.number().int("Negara tidak valid.").min(0).max(999999),
  layanan: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Kode layanan tidak valid."),
  operator: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_.\- ]+$/, "Operator tidak valid."),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi.").max(72),
  newPassword: password,
});

export const depositSchema = z.object({
  amountIdr: z.coerce
    .number()
    .int("Nominal harus berupa bilangan bulat.")
    .min(10000, "Minimal permintaan deposit Rp10.000.")
    .max(100000000, "Maksimal permintaan deposit Rp100.000.000."),
  paymentReference: z
    .string()
    .trim()
    .min(4, "Referensi transfer minimal 4 karakter.")
    .max(120, "Referensi transfer maksimal 120 karakter."),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional().default(""),
});

export const depositDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().trim().max(500).optional().default(""),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  email: z.string().trim().toLowerCase().email("Alamat email tidak valid.").max(180),
  subject: z.string().trim().min(3, "Subjek minimal 3 karakter.").max(120),
  message: z.string().trim().min(10, "Pesan minimal 10 karakter.").max(2000),
});

export const supportDecisionSchema = z.object({
  status: z.enum(["open", "resolved"]),
});

export function sanitizeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://kaii.local");
    if (url.origin !== "https://kaii.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function safeIdempotencyKey(value: string | null): string | null {
  if (!value) return null;
  const key = value.trim();
  if (!/^[a-zA-Z0-9:_-]{16,120}$/.test(key)) return null;
  return key;
}
