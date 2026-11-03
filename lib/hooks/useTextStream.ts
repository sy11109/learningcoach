"use client";

import { useCallback, useRef, useState } from "react";

export interface StreamResult {
  ok: boolean;
  content: string;
  error?: string;
  aborted?: boolean;
}

interface StreamEvent {
  event: string;
  data: string;
}

function parseBlock(block: string): StreamEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

/**
 * Consumes this app's SSE protocol (delta / done / error) from a POST request
 * and exposes the growing text so the UI can render it as it arrives.
 */
export function useTextStream() {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => setText(""), []);

  const run = useCallback(
    async (url: string, body: unknown = {}): Promise<StreamResult> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setText("");
      setStreaming(true);
      let content = "";

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let message = `请求失败（HTTP ${res.status}）。`;
          try {
            const data = (await res.json()) as {
              error?: { message?: string };
            };
            if (data?.error?.message) message = data.error.message;
          } catch {
            // fall through to the generic message
          }
          return { ok: false, content: "", error: message };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let split: number;
          while ((split = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            const parsed = parseBlock(block);
            if (!parsed) continue;

            let payload: {
              text?: string;
              content?: string;
              message?: string;
            };
            try {
              payload = JSON.parse(parsed.data);
            } catch {
              continue;
            }

            if (parsed.event === "delta" && typeof payload.text === "string") {
              content += payload.text;
              setText(content);
            } else if (parsed.event === "done") {
              if (typeof payload.content === "string" && payload.content) {
                content = payload.content;
                setText(content);
              }
              return { ok: true, content };
            } else if (parsed.event === "error") {
              return {
                ok: false,
                content,
                error: payload.message || "讲解生成失败，请重试。",
              };
            }
          }
        }

        return { ok: true, content };
      } catch (error) {
        if (controller.signal.aborted) {
          return { ok: false, content, aborted: true, error: "已停止生成" };
        }
        return {
          ok: false,
          content,
          error:
            error instanceof Error
              ? "连接中断，请检查网络后重试。"
              : "连接中断，请重试。",
        };
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setStreaming(false);
      }
    },
    [],
  );

  return { text, streaming, run, stop, reset };
}
