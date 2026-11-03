import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Milestone,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { LessonSectionCard } from "@/components/learn/LessonSectionCard";
import { KeyPointList } from "@/components/learn/KeyPoints";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { cn } from "@/lib/utils";
import {
  LESSON_MODE_META,
  STAGE_META,
  type LadderLevel,
  type StageLesson,
} from "@/lib/types";

export function LessonView({
  lesson,
  level,
  projectId,
  savingIndex,
  generating,
  onToggle,
  onRegenerate,
  onNextStage,
}: {
  lesson: StageLesson;
  level: LadderLevel | undefined;
  projectId: string;
  savingIndex: number | null;
  generating: boolean;
  onToggle: (index: number) => void;
  onRegenerate: () => void;
  onNextStage: () => void;
}) {
  const { plan, completed } = lesson;
  const sections = plan.sections;
  const completedCount = completed.length;
  const allDone = sections.length > 0 && completedCount === sections.length;
  const percent =
    sections.length > 0
      ? Math.round((completedCount / sections.length) * 100)
      : 0;
  const stageMeta = STAGE_META[lesson.stage];
  const examHref = `/project/${projectId}/exam?focus=${encodeURIComponent(
    plan.title,
  )}`;

  return (
    <div className="space-y-4">
      <Card id="lesson-top" className="scroll-mt-24 overflow-hidden">
        <div className="border-b border-line/80 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{stageMeta.name}</Badge>
                <Badge tone="outline">
                  {LESSON_MODE_META[lesson.mode].name}
                </Badge>
                <span className="text-[11px] text-muted">
                  {level?.title ?? `第 ${lesson.stage} 阶`}
                </span>
              </div>
              <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight text-ink">
                {plan.title}
              </h2>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
                {plan.overview}
              </p>
              {plan.throughline ? (
                <div className="mt-3 flex max-w-2xl gap-2.5 rounded-lg border border-accent/20 bg-accent-soft/35 px-3.5 py-2.5">
                  <Milestone size={14} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <p className="text-[10.5px] font-semibold text-accent-deep">
                      本阶段主线
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                      {plan.throughline}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={examHref}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-medium text-ink transition-colors hover:bg-paper-deep/60"
              >
                去考试
                <ArrowRight size={13} />
              </Link>
              <ConfirmButton
                variant="ghost"
                size="sm"
                loading={generating}
                onConfirm={onRegenerate}
                confirmText="确认重生成？"
                title="重新生成会清空已有的学习勾选"
              >
                {!generating ? <RefreshCw size={13} /> : null}
                重新生成
              </ConfirmButton>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen size={12} />
              {sections.length} 节
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} />
              约 {plan.totalMinutes} 分钟
            </span>
            <span className="inline-flex items-center gap-1.5 text-accent-deep">
              <CheckCircle2 size={12} />
              已学 {completedCount}/{sections.length}
            </span>
          </div>

          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-paper-deep"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="学习进度"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <KeyPointList points={plan.keyPoints} title="本阶段重点" />

          <div>
            <p className="text-[11px] font-semibold text-muted">本课目录</p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {sections.map((section, index) => {
                const done = completed.includes(index);
                return (
                  <a
                    key={index}
                    href={`#section-${index + 1}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] transition-colors",
                      done
                        ? "border-accent/20 bg-accent-soft/30 text-accent-deep"
                        : "border-line bg-paper/40 text-ink-soft hover:border-accent/30 hover:bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "tabular grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9.5px] font-semibold",
                        done
                          ? "bg-accent text-white"
                          : "bg-surface text-muted",
                      )}
                    >
                      {done ? <Check size={11} /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {section.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {section.minutes}′
                    </span>
                    {index < sections.length - 1 ? (
                      <ArrowRight
                        size={11}
                        className="hidden shrink-0 text-muted/60 sm:block"
                      />
                    ) : null}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {sections.map((section, index) => (
        <LessonSectionCard
          key={index}
          index={index}
          section={section}
          completed={completed.includes(index)}
          saving={savingIndex === index}
          disabled={savingIndex !== null}
          projectId={projectId}
          onToggle={onToggle}
        />
      ))}

      {allDone ? (
        <Card className="border-accent/25 bg-accent-soft/50 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white">
                <Trophy size={18} />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-ink">
                  第 {lesson.stage} 阶的内容学完了
                </p>
                <p className="mt-0.5 max-w-xl text-[12px] leading-relaxed text-muted">
                  学完不等于学会。去 AI 考官那里用题目验证一遍，再挑一个概念讲给 AI 听。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lesson.stage < 5 ? (
                <Button variant="secondary" size="sm" onClick={onNextStage}>
                  看下一阶
                </Button>
              ) : null}
              <Link
                href={examHref}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-deep"
              >
                去考试
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="bg-paper/50 px-5 py-4">
        <p className="text-[11px] font-semibold text-muted">学完这一阶段后</p>
        <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-ink-soft">
          {plan.nextStep}
        </p>
      </Card>
    </div>
  );
}
