export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function readError(res: Response): Promise<ApiError> {
  let code = "HTTP_ERROR";
  let message = `请求失败（HTTP ${res.status}）。`;
  try {
    const data = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    if (data?.error?.code) code = data.error.code;
    if (data?.error?.message) message = data.error.message;
  } catch {
    // keep the fallback
  }
  return new ApiError(code, message, res.status);
}

export async function apiRequest<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError(
      "NETWORK",
      "无法连接服务器，请确认开发服务器仍在运行。",
      0,
    );
  }
  if (!res.ok) throw await readError(res);
  return (await res.json()) as T;
}

export function postJson<T>(
  url: string,
  body: unknown = {},
  signal?: AbortSignal,
): Promise<T> {
  return apiRequest<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export function patchJson<T>(url: string, body: unknown): Promise<T> {
  return apiRequest<T>(url, { method: "PATCH", body: JSON.stringify(body) });
}

export function putJson<T>(url: string, body: unknown): Promise<T> {
  return apiRequest<T>(url, { method: "PUT", body: JSON.stringify(body) });
}

export function postForm<T>(
  url: string,
  form: FormData,
  signal?: AbortSignal,
): Promise<T> {
  return apiRequest<T>(url, { method: "POST", body: form, signal });
}

const CODE_HINTS: Record<string, string> = {
  NO_API_KEY: "请到「设置」页检查 DeepSeek 配置。",
  AI_AUTH: "API Key 可能无效，请到「设置」页检查后重试。",
  AI_BALANCE: "DeepSeek 账户余额不足，请充值后再试。",
  AI_RATE_LIMIT: "请求太频繁，稍等片刻再试。",
  AI_BAD_REQUEST: "请求被模型拒绝，请稍后重试。",
  AI_BAD_OUTPUT: "AI 输出格式异常，请重试一次。",
  AI_UPSTREAM: "模型服务暂时不可用，请稍后重试。",
  AI_TIMEOUT: "模型响应超时，请重试。",
  NETWORK: "",
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const hint = CODE_HINTS[error.code];
    if (hint && !error.message.includes(hint)) {
      return `${error.message} ${hint}`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "操作失败，请稍后重试。";
}
