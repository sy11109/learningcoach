import { z } from "zod";
import { readJson } from "@/lib/api";
import { AppError, errorResponse } from "@/lib/errors";
import {
  getLesson,
  setLessonProgress,
} from "@/lib/repos/lessons";
import { getProjectOrThrow } from "@/lib/repos/projects";
import {
  LESSON_MODES,
  type LessonMode,
  type Stage,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const ModeSchema = z.enum(LESSON_MODES);

const ProgressSchema = z.object({
  mode: ModeSchema.default("standard"),
  completed: z.array(z.number().int().min(0).max(20)).max(20),
});

function parseStage(raw: string): Stage {
  const stage = Number(raw);
  if (!Number.isInteger(stage) || stage < 1 || stage > 5) {
    throw new AppError("VALIDATION", "阶段参数必须是 1-5 的整数。");
  }
  return stage as Stage;
}

function parseMode(raw: string | null): LessonMode {
  const parsed = ModeSchema.safeParse(raw ?? "standard");
  if (!parsed.success) {
    throw new AppError("VALIDATION", "学习模式参数不合法。");
  }
  return parsed.data;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string; stage: string }> },
) {
  try {
    const { id, stage } = await ctx.params;
    getProjectOrThrow(id);
    const mode = parseMode(new URL(request.url).searchParams.get("mode"));
    return Response.json({ lesson: getLesson(id, parseStage(stage), mode) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; stage: string }> },
) {
  try {
    const { id, stage } = await ctx.params;
    getProjectOrThrow(id);
    const parsed = parseStage(stage);
    const { mode, completed } = await readJson(request, ProgressSchema);
    return Response.json({
      lesson: setLessonProgress(id, parsed, mode, completed),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
