import { z } from "zod";
import { readJson } from "@/lib/api";
import { chatJson } from "@/lib/ai/client";
import { buildStageEvaluationMessages } from "@/lib/ai/prompts";
import { StageResultSchema } from "@/lib/ai/schemas";
import { AppError, errorResponse } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { getLadder } from "@/lib/repos/ladder";
import {
  getAssessmentOrThrow,
  saveAnswers,
  scoreAssessment,
} from "@/lib/repos/assessment";
import type { Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const SubmitSchema = z.object({
  assessmentId: z.string().uuid(),
  answers: z.record(z.string(), z.string().max(2000)),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const project = getProjectOrThrow(id);
    const { assessmentId, answers } = await readJson(request, SubmitSchema);

    const assessment = getAssessmentOrThrow(assessmentId);
    if (assessment.projectId !== project.id) {
      throw new AppError("NOT_FOUND", "测评不存在。");
    }

    if (assessment.status === "scored" && assessment.result) {
      return Response.json({ assessment, result: assessment.result });
    }

    const missing = assessment.questions.filter(
      (question) => !answers[question.id]?.trim(),
    );
    if (missing.length > 0) {
      throw new AppError(
        "VALIDATION",
        `还有 ${missing.length} 道题没有回答，请全部答完再提交。`,
      );
    }

    saveAnswers(assessment.id, answers);

    const ladder = getLadder(project.id);
    const output = await chatJson({
      messages: buildStageEvaluationMessages({
        project,
        ladder,
        questions: assessment.questions,
        answers,
      }),
      schema: StageResultSchema,
      maxTokens: 1800,
      kind: "assessment-evaluate",
      projectId: project.id,
      repairHint:
        '{"stage":3,"evidence":["……","……"],"nextStep":"……"}',
    });

    const result = {
      stage: output.stage as Stage,
      evidence: output.evidence,
      nextStep: output.nextStep,
    };
    const scored = scoreAssessment(assessment.id, result);

    return Response.json({ assessment: scored, result });
  } catch (error) {
    return errorResponse(error);
  }
}
