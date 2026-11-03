import { chatJson, getAiConfig } from "@/lib/ai/client";
import { buildFeynmanQuestionMessages } from "@/lib/ai/prompts";
import { FeynmanQuestionsSchema } from "@/lib/ai/schemas";
import { AppError, errorResponse } from "@/lib/errors";
import { collectLearnedContent } from "@/lib/learned-content";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { saveSelfChecks } from "@/lib/repos/selfChecks";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const project = getProjectOrThrow(id);
    getAiConfig();

    const learned = collectLearnedContent(project);
    if (!learned.text) {
      throw new AppError(
        "CONFLICT",
        "还没有可用的学习内容。先去「学习内容」生成并学完一节，再回来生成自测题。",
      );
    }

    const output = await chatJson({
      messages: buildFeynmanQuestionMessages({
        project,
        learnedText: learned.text,
        fallback: learned.fallback,
        stage: learned.stage,
      }),
      schema: FeynmanQuestionsSchema,
      maxTokens: 2600,
      timeoutMs: 120_000,
      kind: "feynman-self-check",
      projectId: project.id,
      repairHint:
        '{"questions":[{"question":"……？","hint":"……","answer":"……","source":"第 2 阶 · …… · ……"}]}',
    });

    const questions = output.questions.slice(0, 5);
    const saved = saveSelfChecks(project.id, questions, {
      fallback: learned.fallback,
      stage: learned.stage,
      sectionCount: learned.sectionCount,
    });

    return Response.json(saved);
  } catch (error) {
    return errorResponse(error);
  }
}
