import { getAiConfig } from "@/lib/ai/client";
import { buildExplainMessages } from "@/lib/ai/prompts";
import { AppError } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import {
  getFeynmanMessages,
  getFeynmanSessionOrThrow,
  updateFeynmanProgress,
} from "@/lib/repos/feynman";
import { sseErrorResponse, streamExplanation } from "@/lib/streaming";
import type { FeynmanCritique } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await ctx.params;
    getAiConfig();

    const session = getFeynmanSessionOrThrow(sessionId);
    if (session.status === "passed") {
      throw new AppError("CONFLICT", "这个概念已经通过，无需再讲。");
    }

    const project = getProjectOrThrow(session.projectId);
    const messages = getFeynmanMessages(sessionId);
    const round = session.rounds + 1;

    const alreadyExplained = messages.some(
      (message) =>
        message.round === round &&
        (message.kind === "explain" || message.kind === "retry-explain"),
    );
    if (alreadyExplained) {
      throw new AppError("CONFLICT", "本轮的讲解已经生成，请先复述。");
    }

    const latestFeedback = [...messages]
      .reverse()
      .find((message) => message.kind === "feedback" && message.meta);
    const critique = latestFeedback?.meta?.critique as
      | FeynmanCritique
      | undefined;
    if (!critique) {
      throw new AppError("CONFLICT", "还没有点评结果，暂时无法重讲。");
    }

    return streamExplanation({
      sessionId,
      projectId: project.id,
      round,
      kind: "retry-explain",
      messages: buildExplainMessages({
        project,
        concept: session.concept,
        weakPoints: {
          missing: critique.missing ?? [],
          confused: critique.confused ?? [],
          jargon: critique.jargon ?? [],
        },
      }),
      signal: request.signal,
      onComplete: () => updateFeynmanProgress(sessionId, { rounds: round }),
    });
  } catch (error) {
    return sseErrorResponse(error);
  }
}
