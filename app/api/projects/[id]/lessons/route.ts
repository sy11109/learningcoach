import { z } from "zod";
import { readJson } from "@/lib/api";
import { chatJson, getAiConfig } from "@/lib/ai/client";
import { buildLessonMessages } from "@/lib/ai/prompts";
import { LessonPlanSchema } from "@/lib/ai/schemas";
import { AppError, errorResponse } from "@/lib/errors";
import { getLadder } from "@/lib/repos/ladder";
import {
  listLessonSummaries,
  saveLesson,
  getLesson,
} from "@/lib/repos/lessons";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { getSourceTexts } from "@/lib/repos/sources";
import {
  LESSON_MODES,
  type LessonMode,
  type LessonPlan,
  type Stage,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const GenerateSchema = z.object({
  stage: z.number().int().min(1).max(5),
  mode: z.enum(LESSON_MODES).default("standard"),
  regenerate: z.boolean().default(false),
});

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    getProjectOrThrow(id);
    return Response.json({ lessons: listLessonSummaries(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const project = getProjectOrThrow(id);
    const config = getAiConfig();
    const {
      stage: stageNumber,
      mode,
      regenerate,
    } = await readJson(request, GenerateSchema);
    // The schema already constrains the value to 1-5.
    const stage = stageNumber as Stage;
    const lessonMode = mode as LessonMode;

    const level = getLadder(project.id).find((item) => item.stage === stage);
    if (!level) {
      throw new AppError(
        "CONFLICT",
        "请先生成完整的学习阶梯，再生成这一阶段的学习内容。",
      );
    }

    const existing = getLesson(project.id, stage, lessonMode);
    if (existing && !regenerate) {
      return Response.json({ lesson: existing });
    }

    const output = await chatJson({
      messages: buildLessonMessages({
        project,
        ladder: getLadder(project.id),
        level,
        mode: lessonMode,
        sources: getSourceTexts(project.id),
      }),
      schema: LessonPlanSchema,
      maxTokens: 8000,
      timeoutMs: 180_000,
      kind: "lesson-generate",
      projectId: project.id,
      repairHint:
        '{"title":"……","overview":"……","throughline":"……","totalMinutes":90,"keyPoints":["……","……","……"],"sections":[{"title":"……","kind":"concept","minutes":20,"bridge":"……","takeaway":"……","content":"……","keyPoints":["……"],"example":{"title":"……","language":"ts","content":"……"},"practice":"……","checkpoint":"……？"}],"nextStep":"……"}',
    });

    const plan: LessonPlan = {
      title: output.title,
      overview: output.overview,
      throughline: output.throughline,
      totalMinutes: output.totalMinutes,
      keyPoints: output.keyPoints,
      sections: output.sections.map((section) => ({
        ...section,
        example: section.example ?? null,
      })),
      nextStep: output.nextStep,
    };

    const lesson = saveLesson(
      project.id,
      stage,
      lessonMode,
      plan,
      config.model,
    );

    return Response.json({ lesson }, { status: existing ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
