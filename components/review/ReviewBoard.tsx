"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookX,
  ChevronDown,
  CircleAlert,
  Flame,
  ListChecks,
  RotateCcw,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn, formatDate, optionLetter } from "@/lib/utils";
import type { ReviewData, ReviewTopicGroup } from "@/lib/repos/review";

type Filter = "all" | "repeated" | "occasional";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "repeated", label: "反复出错" },
  { value: "occasional", label: "偶发失误" },
];

function StatCard({
  label,
  value,
  hint,
  tone = "text-ink",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-[10.5px] text-muted">{label}</p>
      <p className={cn("tabular mt-1 text-[22px] font-semibold", tone)}>
        {value}
      </p>
      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{hint}</p>
    </div>
  );
}

function MistakeItem({
  mistake,
}: {
  mistake: ReviewTopicGroup["recentMistakes"][number];
}) {
  const isChoice =
    mistake.questionType === "choice" &&
    mistake.options.length === 4 &&
    mistake.correct !== null;

  return (
    <div className="space-y-2 rounded-lg border border-line/80 bg-paper/40 px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone={isChoice ? "outline" : "neutral"}>
          {isChoice ? "单选" : "简答"} · {mistake.score}/10
        </Badge>
        <span className="text-[10px] text-muted">
          {formatDate(mistake.answeredAt)}
        </span>
      </div>
      <p className="text-[12.5px] font-medium leading-relaxed text-ink">
        {mistake.question}
      </p>

      {isChoice ? (
        <div className="space-y-1">
          {mistake.options.map((option, index) => {
            const selected =
              mistake.answer === option && index !== mistake.correct;
            const correct = index === mistake.correct;
            return (
              <p
                key={index}
                className={cn(
                  "flex items-start gap-1.5 rounded px-1.5 py-1 text-[11.5px] leading-relaxed",
                  correct
                    ? "bg-accent-soft/60 text-accent-deep"
                    : selected
                      ? "bg-danger-soft/50 text-danger"
                      : "text-muted",
                )}
              >
                <span className="tabular shrink-0 font-semibold">
                  {optionLetter(index)}
                </span>
                <span className="min-w-0 flex-1">{option}</span>
                <span className="shrink-0 text-[9.5px]">
                  {correct ? "正确答案" : selected ? "你选的" : ""}
                </span>
              </p>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="rounded bg-surface px-2 py-1.5 text-[11.5px] leading-relaxed text-ink-soft">
            <span className="font-medium text-danger">你的答案：</span>
            {mistake.answer || "（空）"}
          </p>
          {mistake.reference ? (
            <p className="rounded bg-surface px-2 py-1.5 text-[11.5px] leading-relaxed text-ink-soft">
              <span className="font-medium text-accent-deep">参考答案：</span>
              {mistake.reference}
            </p>
          ) : null}
        </div>
      )}

      {mistake.explanation ? (
        <p className="text-[11.5px] leading-relaxed text-muted">
          {mistake.explanation}
        </p>
      ) : null}
    </div>
  );
}

function TopicCard({
  group,
  projectId,
}: {
  group: ReviewTopicGroup;
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
  const untagged = group.topic === "未标注知识点";
  const recentType = group.recentMistakes[0]?.questionType ?? "choice";
  const focusHref = `/project/${projectId}/exam?focus=${encodeURIComponent(
    group.topic,
  )}&type=${recentType}`;

  return (
    <Card className={cn("overflow-hidden", group.repeated && "border-amber/35")}>
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-1.5 text-[14.5px] font-semibold tracking-tight text-ink">
                {group.repeated ? (
                  <Flame size={14} className="text-amber" />
                ) : (
                  <CircleAlert size={14} className="text-muted" />
                )}
                {group.topic}
              </h3>
              <Badge tone={group.repeated ? "amber" : "neutral"}>
                {group.repeated
                  ? `反复出错 · ${group.wrongCount} 次`
                  : "偶发失误 · 1 次"}
              </Badge>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span>作答 {group.totalCount} 次</span>
              <span>错误率 {group.errorRate}%</span>
              {group.avgScore !== null ? (
                <span>平均 {group.avgScore} 分</span>
              ) : null}
              {group.lastWrongAt ? (
                <span>最近一次错：{formatDate(group.lastWrongAt)}</span>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {group.repeated
                ? "同一个知识点反复错，说明不是手滑，而是理解里有一个稳定的缺口。建议先重读这一节，再定向重考。"
                : "只错了一次，可能是一次疏忽。先看解析确认自己真的会，不必反复刷。"}
            </p>
          </div>

          {!untagged ? (
            <Link
              href={focusHref}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-soft px-3 text-[12px] font-medium text-accent-deep transition-colors hover:bg-accent/15"
            >
              <Target size={13} />
              针对此知识点重考
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-paper/40 px-3 py-2 text-[11.5px] font-medium text-muted transition-colors hover:text-ink"
        >
          {open ? "收起最近错题" : `查看最近 ${group.recentMistakes.length} 道错题`}
          <ChevronDown
            size={14}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>

        {open ? (
          <div className="mt-2.5 space-y-2">
            {group.recentMistakes.map((mistake) => (
              <MistakeItem key={mistake.id} mistake={mistake} />
            ))}
            {group.wrongCount > group.recentMistakes.length ? (
              <p className="px-1 text-[10.5px] text-muted">
                这个知识点还有 {group.wrongCount - group.recentMistakes.length}{" "}
                道更早的错题，这里只展示最近 3 道。
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function ReviewBoard({
  projectId,
  data,
}: {
  projectId: string;
  data: ReviewData;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const { overview, groups } = data;
  const visible = groups.filter((group) =>
    filter === "all"
      ? true
      : filter === "repeated"
        ? group.repeated
        : !group.repeated,
  );

  if (groups.length === 0) {
    return (
      <Card className="px-6 py-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
          <BookX size={22} />
        </span>
        <p className="mt-3 text-[15px] font-semibold text-ink">还没有错题</p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted">
          {overview.totalAnswered === 0
            ? "先让 AI 考官考一场。答错的题会按知识点自动汇总到这里，反复错和偶发错会分开标记。"
            : "目前所有已作答的题目都拿到了不错的分数。可以去考试里挑战更高难度，看看会不会暴露新的缺口。"}
        </p>
        <Link
          href={`/project/${projectId}/exam`}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent-deep"
        >
          <RotateCcw size={14} />
          去 AI 考官
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="错题总数"
          value={overview.totalWrong}
          hint={`来自 ${overview.totalAnswered} 次作答`}
          tone="text-danger"
        />
        <StatCard
          label="涉及知识点"
          value={overview.totalTopics}
          hint="按 AI 标注的知识点聚合"
        />
        <StatCard
          label="反复出错"
          value={overview.repeatedTopicCount}
          hint="同一知识点错 2 次及以上"
          tone="text-amber"
        />
        <StatCard
          label="偶发失误"
          value={overview.occasionalTopicCount}
          hint="只错过 1 次的知识点"
          tone="text-accent-deep"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-line bg-paper-deep/40 p-1">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[11.5px] font-medium transition-colors",
                  active
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted">
          <ListChecks size={12} />
          按错误次数排序，先补反复出错的知识点
        </p>
      </div>

      {visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((group) => (
            <TopicCard key={group.key} group={group} projectId={projectId} />
          ))}
        </div>
      ) : (
        <Card className="px-5 py-8 text-center">
          <p className="text-[13px] font-medium text-ink">
            这个筛选下没有知识点
          </p>
          <p className="mt-1 text-[12px] text-muted">
            切换到「全部」看看，或者去考试里继续积累记录。
          </p>
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3 bg-paper/50 px-5 py-4">
        <div>
          <p className="text-[12.5px] font-semibold text-ink">
            复习完再验证一次
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
            「针对此知识点重考」只会预填聚焦范围和题型，不会自动开局；确认后点开始考试。
          </p>
        </div>
        <Link
          href={`/project/${projectId}/exam`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-medium text-ink transition-colors hover:border-accent/35 hover:text-accent"
        >
          去 AI 考官
          <ArrowRight size={13} />
        </Link>
      </Card>
    </div>
  );
}
