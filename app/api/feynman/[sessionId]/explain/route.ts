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

    return streamExplanation({
      sessionId,
      projectId: project.id,
      round,
      kind: "explain",
      messages: buildExplainMessages({ project, concept: session.concept }),
      signal: request.signal,
      onComplete: () => updateFeynmanProgress(sessionId, { rounds: round }),
    });
  } catch (error) {
    return sseErrorResponse(error);
  }
}
