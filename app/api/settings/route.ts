import { z } from "zod";
import { readJson } from "@/lib/api";
import { getAiConfigState } from "@/lib/ai/client";
import { errorResponse } from "@/lib/errors";
import { setSettings } from "@/lib/repos/settings";

export const dynamic = "force-dynamic";

const HttpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => !value || /^https?:\/\//i.test(value), {
    message: "接口地址必须以 http:// 或 https:// 开头",
  });

const SettingsSchema = z.object({
  apiKey: z.string().max(500).optional(),
  baseUrl: HttpUrl.optional(),
  model: z.string().trim().max(120).optional(),
  clearKey: z.boolean().optional(),
});

export async function GET() {
  try {
    return Response.json(getAiConfigState());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const input = await readJson(request, SettingsSchema);
    const entries: Record<string, string | null> = {};

    if (input.clearKey) entries["ai.apiKey"] = null;
    if (input.apiKey?.trim()) entries["ai.apiKey"] = input.apiKey.trim();
    if (input.baseUrl !== undefined) {
      entries["ai.baseUrl"] = input.baseUrl.trim() || null;
    }
    if (input.model !== undefined) {
      entries["ai.model"] = input.model.trim() || null;
    }

    setSettings(entries);
    return Response.json(getAiConfigState());
  } catch (error) {
    return errorResponse(error);
  }
}
