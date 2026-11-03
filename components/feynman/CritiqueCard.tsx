import {
  CheckCircle2,
  CircleAlert,
  HelpCircle,
  Quote,
  XCircle,
} from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { cn } from "@/lib/utils";
import type { FeynmanCritique } from "@/lib/types";

function ListBlock({
  title,
  items,
  icon,
  className,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  className: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-line/80 bg-surface px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-soft">
        <span className={className}>{icon}</span>
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-[11.5px] leading-relaxed text-ink-soft"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CritiqueCard({
  critique,
  round,
}: {
  critique: FeynmanCritique;
  round: number;
}) {
  const passed = critique.passed;

  return (
    <div
      className={cn(
        "rounded-card border bg-surface p-4",
        passed ? "border-accent/30" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10.5px] text-muted">AI 点评 · 第 {round} 轮</p>
          <p
            className={cn(
              "mt-0.5 text-[14px] font-semibold",
              passed ? "text-accent-deep" : "text-amber",
            )}
          >
            {passed ? "讲清楚了" : "还不够清楚，需要再讲一次"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProgressRing
            value={critique.clarity}
            max={10}
            size={54}
            stroke={5}
            tone={passed ? "#0E6B52" : "#B45309"}
          >
            <span className="tabular text-[13px] font-semibold text-ink">
              {critique.clarity}
              <span className="text-[9px] font-normal text-muted">/10</span>
            </span>
            <span className="block text-[7.5px] text-muted">清晰度</span>
          </ProgressRing>
          <ProgressRing
            value={critique.mastery}
            max={100}
            size={54}
            stroke={5}
            tone={passed ? "#0E6B52" : "#B45309"}
          >
            <span className="tabular text-[13px] font-semibold text-ink">
              {critique.mastery}
            </span>
            <span className="block text-[7.5px] text-muted">掌握度</span>
          </ProgressRing>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ListBlock
          title="讲对了"
          items={critique.correct}
          icon={<CheckCircle2 size={12} />}
          className="text-accent"
        />
        <ListBlock
          title="漏掉了"
          items={critique.missing}
          icon={<CircleAlert size={12} />}
          className="text-amber"
        />
        <ListBlock
          title="讲错了 / 混淆了"
          items={critique.confused}
          icon={<XCircle size={12} />}
          className="text-danger"
        />
        <ListBlock
          title="用了没真正理解的词"
          items={critique.jargon}
          icon={<Quote size={12} />}
          className="text-[#6d28d9]"
        />
      </div>

      {critique.feedback ? (
        <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
          {critique.feedback}
        </p>
      ) : null}

      {critique.followUpQuestion ? (
        <div className="mt-3 flex gap-2 rounded-lg bg-paper px-3 py-2.5">
          <HelpCircle size={13} className="mt-0.5 shrink-0 text-muted" />
          <div>
            <p className="text-[10px] font-medium text-muted">再想一想</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
              {critique.followUpQuestion}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
