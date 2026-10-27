export type ProviderErrorKind =
  | "config"
  | "business"
  | "transport"
  | "invalid_response"
  | "rate_limited";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly httpStatus: number | null;

  constructor(kind: ProviderErrorKind, message: string, httpStatus: number | null = null) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.httpStatus = httpStatus;
  }
}

export interface ProviderOrderResult {
  orderId: string;
  phoneNumber: string;
  expiresAt: string | null;
}

export type ProviderOtpResult =
  | { kind: "received"; code: string }
  | { kind: "waiting"; message: string }
  | {
      kind: "terminal";
      status: "cancelled" | "expired" | "failed" | "needs_review";
      message: string;
    }
  | { kind: "error"; message: string };

export interface ProviderCancelResult {
  orderId: string | null;
  refundedAmountIdr: number;
}

export interface ProviderBalanceResult {
  amount: number;
  currency: "IDR";
  note: string;
}

export type ProviderEndpoint =
  | "negara.php"
  | "layanan.php"
  | "operator.php"
  | "order.php"
  | "sms.php"
  | "balance.php"
  | "cancel.php";
