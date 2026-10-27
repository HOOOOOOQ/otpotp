export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  readonly retryAfter?: number;

  constructor(
    code: string,
    message: string,
    status = 400,
    options?: { details?: Record<string, string[]>; retryAfter?: number },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = options?.details;
    this.retryAfter = options?.retryAfter;
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>, message = "Data yang dikirim belum valid.") {
    super("VALIDATION_ERROR", message, 422, { details });
    this.name = "ValidationError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
