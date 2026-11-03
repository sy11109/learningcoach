import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("VALIDATION", "请求体不是合法的 JSON。");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("；");
    throw new AppError("VALIDATION", `参数不合法：${message}`);
  }
  return parsed.data;
}

export function assertSameProject(
  expectedProjectId: string,
  actualProjectId: string,
) {
  if (expectedProjectId !== actualProjectId) {
    throw new AppError("NOT_FOUND", "资源不存在。");
  }
}

export { errorResponse };

export function noStoreJson<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}
