export type OrderStatus =
  | "processing"
  | "waiting_otp"
  | "otp_received"
  | "cancel_pending"
  | "cancelled"
  | "failed"
  | "expired"
  | "needs_review";

export interface Country {
  id: number;
  name: string;
}

export interface ServiceItem {
  code: string;
  name: string;
  priceIdr: number;
  stock: number;
}

export interface Operator {
  value: string;
  label: string;
}

export interface PublicOrder {
  id: string;
  providerOrderId: string | null;
  phoneNumber: string | null;
  countryId: number;
  countryName: string;
  serviceCode: string;
  serviceName: string;
  operator: string;
  priceIdr: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  otpCode: string | null;
  otpExpiresAt: string | null;
  providerErrorCode: string | null;
}

export interface ProfileView {
  id: string;
  email: string;
  fullName: string | null;
  role: "user" | "admin";
  balanceIdr: number;
  createdAt: string;
}

export interface TransactionView {
  id: string;
  orderId: string | null;
  type: "debit" | "refund" | "deposit";
  amountIdr: number;
  balanceAfterIdr: number;
  description: string;
  createdAt: string;
}

export interface DepositRequestView {
  id: string;
  userId: string;
  userEmail?: string | null;
  amountIdr: number;
  paymentReference: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface SupportMessageView {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "resolved";
  createdAt: string;
}

export interface OtpCheckResponse {
  order: PublicOrder;
  status: OrderStatus;
  otpCode: string | null;
  otpExpiresAt: string | null;
  message: string;
  shouldPoll: boolean;
}

export interface CancelOrderResponse {
  order: PublicOrder | null;
  status: OrderStatus;
  refundedAmountIdr: number;
  balanceIdr: number | null;
  message: string;
}

export interface DashboardSummary {
  profile: ProfileView;
  counts: {
    active: number;
    total: number;
    otpReceived: number;
  };
  recentOrders: PublicOrder[];
}

export interface LandingStats {
  available: boolean;
  countries: number | null;
  services: number | null;
  operators: number | null;
  lowestPriceIdr: number | null;
  sampleCountry: Country | null;
  featuredServices: ServiceItem[];
  updatedAt: string | null;
  error: string | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
