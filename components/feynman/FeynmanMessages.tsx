import { CritiqueCard } from "@/components/feynman/CritiqueCard";
import type { FeynmanCritique, FeynmanMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: FeynmanMessage }) {
  if (message.kind === "restate") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%]">
          <p className="mb-1 text-right text-[10.5px] text-muted">
            你的复述 · 第 {message.round} 轮
          </p>
          <div className="whitespace-pre-wrap rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-[13px] leading-relaxed text-white">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  if (message.kind === "feedback") {
    const critique = message.meta?.critique as FeynmanCritique | undefined;
    if (critique) {
      return <CritiqueCard critique={critique} round={message.round} />;
    }
    return (
      <div>
        <p className="mb-1 text-[10.5px] text-muted">
          AI 点评 · 第 {message.round} 轮
        </p>
        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
          {message.content}
        </div>
      </div>
    );
  }

  const interrupted = message.meta?.interrupted === true;
  const isRetry = message.kind === "retry-explain";

  return (
    <div>
      <p className="mb-1 text-[10.5px] text-muted">
        AI 讲解 · 第 {message.round} 轮
        {isRetry ? " · 换了一个讲法" : ""}
      </p>
      <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-[13.5px] leading-[1.85] text-ink-soft">
        {message.content}
      </div>
      {interrupted ? (
        <p className="mt-1 text-[10px] text-amber">
          生成被中断，上面是已保存的部分内容。
        </p>
      ) : null}
    </div>
  );
}
