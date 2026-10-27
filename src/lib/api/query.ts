import { AppError } from "@/lib/api/errors";
import { ORDER_STATUS_META } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/types";

export function readCountryId(request: Request): number {
  const raw = new URL(request.url).searchParams.get("negara");
  if (!raw || !/^\d{1,6}$/.test(raw.trim())) {
    throw new AppError("INVALID_COUNTRY", "Parameter negara tidak valid.", 400);
  }
  return Number(raw);
}

export function readUuid(value: string, label = "ID"): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AppError("INVALID_ID", `${label} tidak valid.`, 400);
  }
  return value;
}

export function readOrderStatus(request: Request): OrderStatus | undefined {
  const raw = new URL(request.url).searchParams.get("status");
  if (!raw) return undefined;
  if (!(raw in ORDER_STATUS_META)) {
    throw new AppError("INVALID_STATUS", "Filter status tidak valid.", 400);
  }
  return raw as OrderStatus;
}

export function readLimit(request: Request, fallback = 100, max = 100): number {
  const raw = new URL(request.url).searchParams.get("limit");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new AppError("INVALID_LIMIT", "Batas data tidak valid.", 400);
  }
  return Math.min(value, max);
}
