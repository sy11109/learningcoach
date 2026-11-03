import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  CornerDownRight,
  Flag,
  Hammer,
  HelpCircle,
  Lightbulb,
  MessageSquareQuote,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { KeyPointList } from "@/components/learn/KeyPoints";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/utils";
import type { LessonExample, LessonKind, LessonSection } from "@/lib/types";

const KIND_META: Record<
  LessonKind,
  {
    label: string;
    icon: LucideIcon;
    tone: "neutral" | "accent" | "amber" | "outline";
    badge: string;
  }
> = {
  concept: {
    label: "核心概念",
    icon: Lightbulb,
    tone: "accent",
    badge: "bg-accent-soft text-accent-deep",
  },
  example: {
    label: "示例拆解",
    icon: Code2,
    tone: "outline",
    badge: "bg-paper-deep text-ink-soft",
  },
  practice: {
    label: "动手练",
    icon: Hammer,
    tone: "accent",
    badge: "bg-accent-soft text-accent-deep",
  },
  pitfall: {
    label: "常见坑",
    icon: AlertTriangle,
    tone: "amber",
    badge: "bg-amber-soft text-amber",
  },
  summary: {
    label: "阶段小结",
    icon: Flag,
    tone: "neutral",
    badge: "bg-paper-deep text-muted",
  },
};

function ExampleBlock({ example }: { example: LessonExample }) {
  const language = example.language.trim();
  const isProse =
    !language ||
    /^(text|plain|markdown|md|note|说明|文字)$/i.test(language);

  if (isProse) {
    return (
      <div className="rounded-xl border border-line bg-paper/60 px-4 py-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
          <Code2 size={12} />
          示例 · {example.title}
        </p>
        <RichText
          text={example.content}
          className="mt-1.5 space-y-1.5 text-[12.5px] leading-relaxed"
        />
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-[#2b2d27] bg-[#22241f]">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="text-[11px] text-white/70">{example.title}</span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-white/50">
          {language}
        </span>
      </figcaption>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12px] leading-relaxed text-[#e9e6dc]"><code>{example.content}</code></pre>
    </figure>
  );
}

export function LessonSectionCard({
  index,
  section,
  completed,
  saving,
  disabled,
  projectId,
  onToggle,
}: {
  index: number;
  section: LessonSection;
  completed: boolean;
  saving: boolean;
  disabled: boolean;
  projectId: string;
  onToggle: (index: number) => void;
}) {
  const meta = KIND_META[section.kind];
  const Icon = meta.icon;

  return (
    <Card
      id={`section-${index + 1}`}
      className={cn(
        "scroll-mt-24 overflow-hidden",
        completed && "border-accent/30",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 border-b border-line/80 px-5 py-4",
          completed && "bg-accent-soft/25",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[13px] font-semibold",
              completed
                ? "border-accent bg-accent text-white"
                : "border-line-strong bg-paper text-muted",
            )}
          >
            {completed ? <Check size={15} /> : index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                {section.title}
              </h3>
              <Badge tone={meta.tone} className={meta.badge}>
                <Icon size={10} />
                {meta.label}
              </Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {section.minutes} 分钟
              </span>
              {section.keyPoints.length > 0 ? (
                <span className="text-amber">
                  · {section.keyPoints.length} 个重点
                </span>
              ) : null}
            </p>
          </div>
        </div>
        {completed ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
            <CheckCircle2 size={13} />
            已学完
          </span>
        ) : null}
      </div>

      <div className="space-y-4 px-5 py-4">
        {section.bridge ? (
          <div className="flex gap-2.5 rounded-lg border border-line bg-paper/50 px-3.5 py-2.5">
            <CornerDownRight
              size={13}
              className="mt-0.5 shrink-0 text-accent"
            />
            <div>
              <p className="text-[10.5px] font-semibold text-muted">
                {index === 0 ? "从主线开始" : "承接上一节"}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                {section.bridge}
              </p>
            </div>
          </div>
        ) : null}

        <RichText text={section.content} />

        <KeyPointList points={section.keyPoints} title="本节重点" />

        {section.takeaway ? (
          <div className="flex gap-2.5 rounded-lg border border-accent/25 bg-accent-soft/40 px-3.5 py-2.5">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="text-[10.5px] font-semibold text-accent-deep">
                这一节要带走
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                {section.takeaway}
              </p>
            </div>
          </div>
        ) : null}

        {section.example ? <ExampleBlock example={section.example} /> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-accent/20 bg-accent-soft/40 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-deep">
              <Hammer size={12} />
              动手练
            </p>
            <RichText
              text={section.practice}
              className="mt-1.5 space-y-1.5 text-[12.5px] leading-relaxed"
            />
          </div>
          <div className="rounded-xl border border-dashed border-line-strong bg-paper/50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              <HelpCircle size={12} />
              自测
            </p>
            <RichText
              text={section.checkpoint}
              className="mt-1.5 space-y-1.5 text-[12.5px] leading-relaxed"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/80 pt-3">
          <Link
            href={`/project/${projectId}/feynman?concept=${encodeURIComponent(
              section.title,
            )}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-medium text-ink transition-colors hover:bg-paper-deep/60"
          >
            <MessageSquareQuote size={13} />
            讲给 AI 听
          </Link>
          <Button
            size="sm"
            variant={completed ? "soft" : "secondary"}
            loading={saving}
            disabled={disabled}
            onClick={() => onToggle(index)}
          >
            {!saving ? (
              completed ? (
                <CheckCircle2 size={14} />
              ) : (
                <Circle size={14} />
              )
            ) : null}
            {completed ? "已学会，撤销" : "标记为已学"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
