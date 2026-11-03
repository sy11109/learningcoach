import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { STAGE_META, type Stage } from "@/lib/types";

type Tone = "neutral" | "accent" | "amber" | "danger" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-deep text-ink-soft",
  accent: "bg-accent-soft text-accent-deep",
  amber: "bg-amber-soft text-amber",
  danger: "bg-danger-soft text-danger",
  outline: "border border-line-strong text-muted",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function StageBadge({
  stage,
  className,
}: {
  stage: Stage | null;
  className?: string;
}) {
  if (!stage) {
    return (
      <Badge tone="outline" className={className}>
        尚未定位
      </Badge>
    );
  }
  const meta = STAGE_META[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5",
        className,
      )}
      style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.name} · {meta.tagline}
    </span>
  );
}
