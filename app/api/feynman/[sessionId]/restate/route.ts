import { z } from "zod";
import { readJson } from "@/lib/api";
import { chatJson } from "@/lib/ai/client";
import { buildCritiqueMessages } from "@/lib/ai/prompts";
import { FeynmanCritiqueSchema } from "@/lib/ai/schemas";
import { AppError, errorResponse } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import {
  addFeynmanMessage,
  getFeynmanMessages,
  getFeynmanSessionOrThrow,
  updateFeynmanProgress,
} from "@/lib/repos/feynman";
import type { FeynmanCritique } from "@/lib/types";
import { clamp } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RestateSchema = z.object({
  restatement: z
    .string()
    .trim()
    .min(10, "再写多一点，试着讲清楚一个完整的意思")
    .max(4000),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await ctx.params;
    const session = getFeynmanSessionOrThrow(sessionId);
    if (session.status === "passed") {
      throw new AppError("CONFLICT", "这个概念已经通过，无需再复述。");
    }
    if (session.rounds < 1) {
      throw new AppError("CONFLICT", "请先让 AI 讲解，再来复述。");
    }

    const { restatement } = await readJson(request, RestateSchema);
    const messages = getFeynmanMessages(sessionId);
    const round = session.rounds;

    const hasExplanation = messages.some(
      (message) =>
        message.round === round &&
        (message.kind === "explain" || message.kind === "retry-explain"),
    );
    if (!hasExplanation) {
      throw new AppError("CONFLICT", "本轮还没有讲解，请先生成讲解。");
    }

    const alreadyRestated = messages.some(
      (message) => message.round === round && message.kind === "restate",
    );
    if (alreadyRestated) {
      throw new AppError("CONFLICT", "本轮已经复述过了，请查看点评。");
    }

    const project = getProjectOrThrow(session.projectId);
    const restateMessage = addFeynmanMessage({
      sessionId,
      round,
      role: "user",
      kind: "restate",
      content: restatement,
    });

    const output = await chatJson({
      messages: buildCritiqueMessages({
        project,
        session,
        messages: [...messages, restateMessage],
        restatement,
        round,
      }),
      schema: FeynmanCritiqueSchema,
      maxTokens: 2400,
      kind: "feynman-critique",
      projectId: project.id,
      repairHint:
        '{"correct":["……"],"missing":["……"],"confused":["……"],"jargon":["……"],"clarity":7,"mastery":55,"passed":false,"feedback":"……","followUpQuestion":"……"}',
    });

    const critique: FeynmanCritique = {
      ...output,
      clarity: Math.round(clamp(output.clarity, 0, 10)),
      mastery: Math.round(clamp(output.mastery, 0, 100)),
    };

    const content =
      critique.feedback.trim() ||
      [
        critique.missing.length ? `漏掉：${critique.missing.join("；")}` : "",
        critique.confused.length ? `混淆：${critique.confused.join("；")}` : "",
        critique.passed ? "核心概念讲对了。" : "还需要换一种讲法再来一次。",
      ]
        .filter(Boolean)
        .join("\n");

    const message = addFeynmanMessage({
      sessionId,
      round,
      role: "ai",
      kind: "feedback",
      content,
      meta: { critique },
    });

    const updated = updateFeynmanProgress(sessionId, {
      mastery: critique.mastery,
      passed: critique.passed,
    });

    return Response.json({
      session: updated,
      message,
      critique,
      passed: critique.passed,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
