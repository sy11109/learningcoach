import { chatJson, getAiConfig } from "@/lib/ai/client";
import {
  buildAssessmentQuestionsMessages,
} from "@/lib/ai/prompts";
import { AssessmentQuestionsSchema } from "@/lib/ai/schemas";
import { AppError, errorResponse } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { getLadder } from "@/lib/repos/ladder";
import {
  createAssessment,
  getLatestAssessment,
} from "@/lib/repos/assessment";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    getProjectOrThrow(id);
    return Response.json({ assessment: getLatestAssessment(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const project = getProjectOrThrow(id);
    getAiConfig();

    const ladder = getLadder(project.id);
    if (ladder.length === 0) {
      throw new AppError(
        "CONFLICT",
        "请先生成学习阶梯，再做阶段定位。",
      );
    }

    const output = await chatJson({
      messages: buildAssessmentQuestionsMessages(project, ladder),
      schema: AssessmentQuestionsSchema,
      maxTokens: 3000,
      kind: "assessment-questions",
      projectId: project.id,
      repairHint:
        '{"questions":[{"question":"……？","hint":"……","options":["……","……","……","……"]}]}（恰好 5 题，每题 4 个选项）',
    });

    const assessment = createAssessment(
      project.id,
      output.questions.map((question, index) => ({
        id: `q${index + 1}`,
        question: question.question,
        hint: question.hint,
        options: question.options,
      })),
    );

    return Response.json({ assessment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
