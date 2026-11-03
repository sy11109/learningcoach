import { z } from "zod";
import { readJson } from "@/lib/api";
import { chatJson, getAiConfig } from "@/lib/ai/client";
import { buildExamStartMessages } from "@/lib/ai/prompts";
import { ExamShortStartSchema, ExamStartSchema } from "@/lib/ai/schemas";
import { errorResponse } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { getLadder } from "@/lib/repos/ladder";
import {
  createExamSession,
  getActiveExam,
  listExamSessions,
} from "@/lib/repos/exam";
import { clamp } from "@/lib/utils";
import type { ExamSessionDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

const StartSchema = z.object({
  maxQuestions: z.number().int().min(3).max(12).default(8),
  startDifficulty: z.number().int().min(1).max(5).default(1),
  focus: z.string().max(200).default(""),
  questionType: z.enum(["choice", "short"]).default("choice"),
});

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    getProjectOrThrow(id);
    return Response.json({
      active: getActiveExam(id),
      sessions: listExamSessions(id),
    });
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

    const active = getActiveExam(project.id);
    if (active) {
      return Response.json({ ...active, existing: true });
    }

    const input = await readJson(request, StartSchema);
    const ladder = getLadder(project.id);
    const isShort = input.questionType === "short";

    const messages = buildExamStartMessages({
      project,
      ladder,
      difficulty: input.startDifficulty,
      focus: input.focus,
      maxQuestions: input.maxQuestions,
      questionType: input.questionType,
    });

    let detail: ExamSessionDetail;
    if (isShort) {
      const output = await chatJson({
        messages,
        schema: ExamShortStartSchema,
        maxTokens: 1400,
        kind: "exam-start",
        projectId: project.id,
        repairHint: `{"question":"……？","reference":"评分要点：……","topic":"……","difficulty":${input.startDifficulty}}`,
      });
      const firstDifficulty = clamp(output.difficulty, 1, 5);
      detail = createExamSession({
        projectId: project.id,
        questionType: "short",
        maxQuestions: input.maxQuestions,
        difficulty: firstDifficulty,
        model: config.model,
        firstQuestion: output.question,
        firstOptions: [],
        firstCorrect: null,
        firstExplanation: null,
        firstReference: output.reference,
        firstTopic: output.topic,
        firstDifficulty,
      });
    } else {
      const output = await chatJson({
        messages,
        schema: ExamStartSchema,
        maxTokens: 1400,
        kind: "exam-start",
        projectId: project.id,
        repairHint: `{"question":"……？","options":["……","……","……","……"],"correct":0,"explanation":"……","topic":"……","difficulty":${input.startDifficulty}}`,
      });
      const firstDifficulty = clamp(output.difficulty, 1, 5);
      detail = createExamSession({
        projectId: project.id,
        questionType: "choice",
        maxQuestions: input.maxQuestions,
        difficulty: firstDifficulty,
        model: config.model,
        firstQuestion: output.question,
        firstOptions: output.options,
        firstCorrect: clamp(output.correct, 0, 3),
        firstExplanation: output.explanation,
        firstReference: null,
        firstTopic: output.topic,
        firstDifficulty,
      });
    }

    return Response.json(detail, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
