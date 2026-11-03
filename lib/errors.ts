export type AppErrorCode =
  | "NO_API_KEY"
  | "AI_AUTH"
  | "AI_BALANCE"
  | "AI_RATE_LIMIT"
  | "AI_BAD_REQUEST"
  | "AI_BAD_OUTPUT"
  | "AI_UPSTREAM"
  | "AI_TIMEOUT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "INTERNAL";

const STATUS: Record<AppErrorCode, number> = {
  NO_API_KEY: 503,
  AI_AUTH: 502,
  AI_BALANCE: 502,
  AI_RATE_LIMIT: 429,
  AI_BAD_REQUEST: 502,
  AI_BAD_OUTPUT: 502,
  AI_UPSTREAM: 502,
  AI_TIMEOUT: 504,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 400,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export function errorPayload(error: unknown): {
  status: number;
  body: { error: { code: string; message: string } };
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message } },
    };
  }
  console.error("[api] unhandled error", error);
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL",
        message: "服务器内部错误，请稍后重试。",
      },
    },
  };
}

export function errorResponse(error: unknown): Response {
  const { status, body } = errorPayload(error);
  return Response.json(body, { status });
}
