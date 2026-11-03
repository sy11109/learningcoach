import { getAiConfig, streamChat, type ChatMessage } from "@/lib/ai/client";
import { AppError } from "@/lib/errors";
import { addFeynmanMessage } from "@/lib/repos/feynman";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export interface StreamExplanationInput {
  sessionId: string;
  projectId: string;
  round: number;
  kind: "explain" | "retry-explain";
  messages: ChatMessage[];
  signal: AbortSignal;
  onComplete?: () => void;
}

/**
 * Streams a Feynman explanation to the browser while persisting the full text
 * (or the partial text, if interrupted) exactly once.
 */
export function streamExplanation(
  input: StreamExplanationInput,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      const persist = (interrupted: boolean) => {
        if (!text.trim()) return null;
        try {
          return addFeynmanMessage({
            sessionId: input.sessionId,
            round: input.round,
            role: "ai",
            kind: input.kind,
            content: text,
            meta: {
              model: getAiConfig().model,
              interrupted,
            },
          });
        } catch (error) {
          console.error("[stream] failed to persist message", error);
          return null;
        }
      };

      try {
        for await (const delta of streamChat({
          messages: input.messages,
          maxTokens: 1400,
          kind: `feynman-${input.kind}`,
          projectId: input.projectId,
          signal: input.signal,
        })) {
          text += delta;
          send("delta", { text: delta });
        }

        if (!text.trim()) {
          throw new AppError(
            "AI_BAD_OUTPUT",
            "AI 没有返回讲解内容，请重试。",
          );
        }

        const message = persist(false);
        try {
          input.onComplete?.();
        } catch (error) {
          console.error("[stream] onComplete failed", error);
        }
        send("done", {
          messageId: message?.id ?? null,
          content: text,
          interrupted: false,
        });
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      } catch (error) {
        const partial = persist(true);
        // A partially written explanation is still a round the learner can
        // respond to; advance the round counter so restating it is allowed.
        if (partial) {
          try {
            input.onComplete?.();
          } catch (callbackError) {
            console.error("[stream] onComplete failed", callbackError);
          }
        }
        const appError =
          error instanceof AppError
            ? error
            : new AppError("AI_UPSTREAM", "讲解生成中断，请重试。");
        send("error", { code: appError.code, message: appError.message });
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

export function sseErrorResponse(error: unknown): Response {
  const appError =
    error instanceof AppError
      ? error
      : new AppError("INTERNAL", "服务器内部错误。");
  return new Response(
    `event: error\ndata: ${JSON.stringify({
      code: appError.code,
      message: appError.message,
    })}\n\n`,
    { status: 200, headers: SSE_HEADERS },
  );
}
