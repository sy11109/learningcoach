import type { ZodType } from "zod";
import { AppError } from "@/lib/errors";
import { recordAiCall } from "@/lib/repos/aiCalls";
import { getSetting } from "@/lib/repos/settings";
import { tryParseJson } from "@/lib/ai/json";
import type { AiConfigState } from "@/lib/types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  thinking: boolean;
  effort: string;
}

function readSetting(key: string): string | null {
  try {
    return getSetting(key)?.trim() || null;
  } catch {
    return null;
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 3)}••••${key.slice(-4)}`;
}

function normalizeBaseUrl(value: string | null): string {
  return (value || "https://api.deepseek.com").replace(/\/+$/, "");
}

function resolveAiConfig(): AiConfig | null {
  const settingsKey = readSetting("ai.apiKey");
  const envKey = process.env.DEEPSEEK_API_KEY?.trim() || null;
  const apiKey = settingsKey || envKey;
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: normalizeBaseUrl(
      readSetting("ai.baseUrl") || process.env.DEEPSEEK_BASE_URL || null,
    ),
    model:
      readSetting("ai.model") ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-flash",
    thinking: process.env.DEEPSEEK_THINKING === "enabled",
    effort: process.env.DEEPSEEK_REASONING_EFFORT || "low",
  };
}

interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface ChatResponse {
  content: string;
  finishReason: string | null;
  usage?: Usage;
}

export function getAiConfig(): AiConfig {
  const config = resolveAiConfig();
  if (!config) {
    throw new AppError(
      "NO_API_KEY",
      "还没有配置 DeepSeek API Key。请到「设置」页填写 Key、接口地址和模型。",
    );
  }
  return config;
}

export function getAiConfigState(): AiConfigState {
  const settingsKey = readSetting("ai.apiKey");
  const envKey = process.env.DEEPSEEK_API_KEY?.trim() || null;
  const apiKey = settingsKey || envKey;
  return {
    configured: Boolean(apiKey),
    source: settingsKey ? "settings" : envKey ? "env" : "none",
    keyMasked: apiKey ? maskKey(apiKey) : null,
    baseUrl: normalizeBaseUrl(
      readSetting("ai.baseUrl") || process.env.DEEPSEEK_BASE_URL || null,
    ),
    model:
      readSetting("ai.model") ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-flash",
    thinking: process.env.DEEPSEEK_THINKING === "enabled",
    effort: process.env.DEEPSEEK_REASONING_EFFORT || "low",
  };
}

export function isAiConfigured() {
  try {
    return Boolean(resolveAiConfig()?.apiKey);
  } catch {
    return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  }
}

function chatUrl(baseUrl: string) {
  return `${baseUrl}/chat/completions`;
}

function modelsUrl(baseUrl: string) {
  return `${baseUrl}/models`;
}

async function upstreamError(res: Response): Promise<AppError> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const data = JSON.parse(text) as {
        error?: { message?: string };
        message?: string;
      };
      detail = data?.error?.message || data?.message || text;
    } catch {
      detail = text;
    }
  } catch {
    detail = "";
  }
  detail = detail.slice(0, 500);

  switch (res.status) {
    case 401:
      return new AppError(
        "AI_AUTH",
        "DeepSeek API Key 无效或已过期，请到「设置」页检查。",
        detail,
      );
    case 402:
      return new AppError(
        "AI_BALANCE",
        "DeepSeek 账户余额不足，请充值后再试。",
        detail,
      );
    case 429:
      return new AppError(
        "AI_RATE_LIMIT",
        "请求过于频繁，已触发限流，请稍等片刻再试。",
        detail,
      );
    case 400:
    case 422:
      return new AppError(
        "AI_BAD_REQUEST",
        `AI 请求参数有误：${detail || "请检查模型名与参数。"}`,
        detail,
      );
    case 500:
    case 503:
      return new AppError(
        "AI_UPSTREAM",
        "DeepSeek 服务暂时不可用，请稍后重试。",
        detail,
      );
    default:
      return new AppError(
        "AI_UPSTREAM",
        `DeepSeek 请求失败（HTTP ${res.status}）。`,
        detail,
      );
  }
}

function normalizeNetworkError(error: unknown, signal?: AbortSignal): AppError {
  if (error instanceof AppError) return error;
  const name = (error as { name?: string } | null)?.name;
  if (signal?.aborted || name === "AbortError") {
    return new AppError("AI_TIMEOUT", "请求已取消。");
  }
  if (name === "TimeoutError") {
    return new AppError("AI_TIMEOUT", "AI 响应超时，请重试。");
  }
  return new AppError(
    "AI_UPSTREAM",
    "无法连接 DeepSeek，请检查网络，以及「设置」页里的接口地址。",
  );
}

interface RequestOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  kind: string;
  projectId?: string;
}

function requestBody(
  config: AiConfig,
  opts: RequestOptions,
  stream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 2000,
    stream,
    thinking: { type: config.thinking ? "enabled" : "disabled" },
  };
  if (config.thinking) {
    body.reasoning_effort = config.effort;
  } else if (opts.temperature !== undefined) {
    body.temperature = opts.temperature;
  }
  if (stream) {
    body.stream_options = { include_usage: true };
  }
  if (opts.json) {
    body.response_format = { type: "json_object" };
    if (!config.thinking) body.temperature = 0.2;
  }
  return body;
}

async function chatCompletion(opts: RequestOptions): Promise<ChatResponse> {
  const config = getAiConfig();
  const started = Date.now();
  const signals = [AbortSignal.timeout(opts.timeoutMs ?? 120_000)];
  if (opts.signal) signals.push(opts.signal);

  try {
    const res = await fetch(chatUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody(config, opts, false)),
      signal: AbortSignal.any(signals),
    });
    if (!res.ok) {
      throw await upstreamError(res);
    }
    const data = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string | null };
        finish_reason?: string | null;
      }>;
      usage?: Usage;
    };
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? "";
    if (!content.trim()) {
      throw new AppError(
        "AI_BAD_OUTPUT",
        "AI 返回了空内容，请重新生成。",
      );
    }
    recordAiCall({
      projectId: opts.projectId,
      kind: opts.kind,
      model: config.model,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      latencyMs: Date.now() - started,
      ok: true,
    });
    return {
      content,
      finishReason: choice?.finish_reason ?? null,
      usage: data.usage,
    };
  } catch (error) {
    const appError = normalizeNetworkError(error, opts.signal);
    recordAiCall({
      projectId: opts.projectId,
      kind: opts.kind,
      model: config.model,
      latencyMs: Date.now() - started,
      ok: false,
      error: appError.message,
    });
    throw appError;
  }
}

export async function chatText(
  opts: RequestOptions & { temperature?: number },
): Promise<string> {
  const result = await chatCompletion(opts);
  return result.content.trim();
}

export interface ChatJsonOptions<T> extends RequestOptions {
  schema: ZodType<T>;
  repairHint?: string;
}

const MAX_JSON_ATTEMPTS = 3;

export async function chatJson<T>(opts: ChatJsonOptions<T>): Promise<T> {
  const messages = [...opts.messages];
  let lastError = "未知错误";

  for (let attempt = 0; attempt < MAX_JSON_ATTEMPTS; attempt += 1) {
    const result = await chatCompletion({ ...opts, messages, json: true });

    if (result.finishReason === "length") {
      lastError = "输出被截断（finish_reason=length），请缩短内容或提高 max_tokens";
    } else {
      const parsed = tryParseJson(result.content);
      if (parsed !== undefined) {
        const validated = opts.schema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
        lastError = validated.error.issues
          .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
          .join("; ");
      } else {
        lastError = "返回内容不是合法 JSON";
      }
    }

    if (attempt < MAX_JSON_ATTEMPTS - 1) {
      messages.push({
        role: "assistant",
        content: result.content.slice(0, 6000),
      });
      messages.push({
        role: "user",
        content: `你上一次的输出无法通过校验：${lastError}。请重新输出 json，只输出 json 本体，不要解释、不要代码围栏，并严格满足下面的结构：\n${
          opts.repairHint ?? "{}"
        }`,
      });
    }
  }

  throw new AppError(
    "AI_BAD_OUTPUT",
    "AI 输出格式异常，请点击重试。",
    lastError,
  );
}

export interface StreamOptions extends RequestOptions {
  onReasoning?: (text: string) => void;
}

/**
 * Yields text deltas only. reasoning_content is passed to onReasoning and never
 * mixed into the visible answer.
 */
export async function* streamChat(
  opts: StreamOptions,
): AsyncGenerator<string, void, unknown> {
  const config = getAiConfig();
  const started = Date.now();
  let usage: Usage | undefined;
  let ok = false;
  let failure: string | undefined;

  const signals = [AbortSignal.timeout(opts.timeoutMs ?? 300_000)];
  if (opts.signal) signals.push(opts.signal);

  try {
    const res = await fetch(chatUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody(config, opts, true)),
      signal: AbortSignal.any(signals),
    });
    if (!res.ok) {
      throw await upstreamError(res);
    }
    if (!res.body) {
      throw new AppError("AI_UPSTREAM", "AI 未返回可读取的流。");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
          buffer = buffer.slice(newlineIndex + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          let chunk: {
            choices?: Array<{
              delta?: {
                content?: string | null;
                reasoning_content?: string | null;
              };
            }>;
            usage?: Usage;
          };
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }

          if (chunk.usage) usage = chunk.usage;
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.reasoning_content && opts.onReasoning) {
            opts.onReasoning(delta.reasoning_content);
          }
          if (typeof delta?.content === "string" && delta.content) {
            yield delta.content;
          }
        }
      }
      ok = true;
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    const appError = normalizeNetworkError(error, opts.signal);
    failure = appError.message;
    throw appError;
  } finally {
    recordAiCall({
      projectId: opts.projectId,
      kind: opts.kind,
      model: config.model,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      latencyMs: Date.now() - started,
      ok,
      error: failure,
    });
  }
}

export interface ConnectionTestResult {
  ok: true;
  model: string;
  models: string[];
  latencyMs: number;
  thinking: boolean;
}

export async function testConnection(): Promise<ConnectionTestResult> {
  const config = getAiConfig();
  const started = Date.now();
  let models: string[] = [];

  try {
    const res = await fetch(modelsUrl(config.baseUrl), {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        data?: Array<{ id?: string }>;
      };
      models = (data.data ?? [])
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));
    }
  } catch {
    // /models is optional; the chat probe below is authoritative.
  }

  await chatCompletion({
    messages: [{ role: "user", content: "Reply with the word OK." }],
    maxTokens: 16,
    kind: "settings-test",
    timeoutMs: 30_000,
  });

  return {
    ok: true,
    model: config.model,
    models,
    latencyMs: Date.now() - started,
    thinking: config.thinking,
  };
}
