"use client";

import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { formatDate } from "@/lib/utils";
import type { ExamSessionDetail } from "@/lib/types";

const SEVERITY: Record<
  string,
  { label: string; tone: "danger" | "amber" | "neutral" }
> = {
  high: { label: "高", tone: "danger" },
  medium: { label: "中", tone: "amber" },
  low: { label: "低", tone: "neutral" },
};

export function ExamReport({
  detail,
  onRestart,
}: {
  detail: ExamSessionDetail;
  onRestart: () => void;
}) {
  const { session, turns } = detail;
  const report = session.report;
  const answered = turns.filter((turn) => turn.answer !== null);

  if (!report) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[14px] font-medium text-ink">报告还没生成</p>
        <p className="mt-1 text-[12px] text-muted">
          这场考试已经结束，但没有存下报告。重新考一次即可生成新的报告。
        </p>
        <Button className="mt-4" onClick={onRestart}>
          <RotateCcw size={15} />
          再考一次
        </Button>
      </Card>
    );
  }

  const score = report.overallScore;
  const tone = score >= 7.5 ? "#0E6B52" : score >= 5 ? "#B45309" : "#B42318";

  return (
    <div className="animate-rise space-y-4">
      <Card className="overflow-hidden">
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <ProgressRing
            value={score}
            size={124}
            stroke={10}
            tone={tone}
            label={score.toFixed(1)}
            sublabel="平均分 / 10"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">
                <CheckCircle2 size={11} />
                考试完成
              </Badge>
              <span className="text-[11px] text-muted">
                {formatDate(session.finishedAt)}
              </span>
            </div>
            <h2 className="mt-2 text-[19px] font-semibold tracking-tight text-ink">
              {report.gaps.length > 0
                ? `这场考试暴露了 ${report.gaps.length} 个缺口`
                : "这场考试没有明显缺口"}
            </h2>
            {report.nextFocus ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {report.nextFocus}
              </p>
            ) : null}
            <p className="tabular mt-2 text-[11px] text-muted">
              {session.questionType === "short" ? "简答题" : "单选题"} · 共答{" "}
              {answered.length} 题 · 上限 {session.maxQuestions} 题
              {session.model ? ` · ${session.model}` : ""}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            icon={<Trophy size={15} />}
            title="真正答对的"
            description="这些是可以记住并迁移的能力"
          />
          {report.strengths.length > 0 ? (
            <ul className="space-y-2 px-5 py-4">
              {report.strengths.map((item, index) => (
                <li
                  key={index}
                  className="flex gap-2 text-[12.5px] leading-relaxed text-ink-soft"
                >
                  <CheckCircle2
                    size={14}
                    className="mt-0.5 shrink-0 text-accent"
                  />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-[12px] text-muted">
              这次没有特别突出的强项，先按下面的计划补缺口。
            </p>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<Target size={15} />}
            title="真实缺口"
            description="不是“没复习到”，是没建立起连接"
          />
          {report.gaps.length > 0 ? (
            <ul className="divide-y divide-line/80">
              {report.gaps.map((gap, index) => {
                const severity = SEVERITY[gap.severity] ?? SEVERITY.medium;
                return (
                  <li key={index} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium text-ink">
                        {gap.topic}
                      </p>
                      <Badge tone={severity.tone}>{severity.label}</Badge>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                      {gap.why}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-[12px] text-muted">
              没有发现明显缺口，可以尝试更高难度的考试。
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={<ClipboardList size={15} />}
          title="复习计划"
          description="按顺序做完，每个动作都在一小时以内"
        />
        {report.reviewPlan.length > 0 ? (
          <ol className="divide-y divide-line/80">
            {report.reviewPlan.map((item, index) => (
              <li key={index} className="flex gap-3 px-5 py-3.5">
                <span className="tabular mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-deep">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-medium text-ink">
                      {item.title}
                    </p>
                    <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[10px] text-muted">
                      {item.minutes} 分钟
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                    {item.action}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-5 py-6 text-center text-[12px] text-muted">
            这次没有生成复习动作，可以直接再考一次。
          </p>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11.5px] text-muted">
          建议先完成复习计划，隔一天再考，记忆更牢。
        </p>
        <Button onClick={onRestart}>
          <RotateCcw size={15} />
          再考一次
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
