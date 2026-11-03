"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  Check,
  Loader2,
  Star,
} from "lucide-react";
import { LessonView } from "@/components/learn/LessonView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  apiRequest,
  errorMessage,
  patchJson,
  postJson,
} from "@/lib/client";
import { cn } from "@/lib/utils";
import {
  LESSON_MODES,
  LESSON_MODE_META,
  STAGE_META,
  type LadderLevel,
  type LessonMode,
  type LessonSummary,
  type Stage,
  type StageLesson,
} from "@/lib/types";

const STAGES: Stage[] = [1, 2, 3, 4, 5];

function toSummary(lesson: StageLesson): LessonSummary {
  return {
    id: lesson.id,
    projectId: lesson.projectId,
    stage: lesson.stage,
    mode: lesson.mode,
    title: lesson.title,
    sectionCount: lesson.plan.sections.length,
    completedCount: lesson.completed.length,
    updatedAt: lesson.updatedAt,
  };
}

function pickSummary(
  summaries: LessonSummary[],
  stage: Stage,
): LessonSummary | undefined {
  return summaries
    .filter((summary) => summary.stage === stage)
    .sort((a, b) => {
      const aDone =
        a.sectionCount > 0 && a.completedCount >= a.sectionCount;
      const bDone =
        b.sectionCount > 0 && b.completedCount >= b.sectionCount;
      if (aDone !== bDone) return aDone ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    })[0];
}

export function LearnWorkspace({
  projectId,
  ladder,
  lessonSummaries,
  initialStage,
  initialMode,
  initialLesson,
  currentStage,
}: {
  projectId: string;
  ladder: LadderLevel[];
  lessonSummaries: LessonSummary[];
  initialStage: Stage;
  initialMode: LessonMode;
  initialLesson: StageLesson | null;
  currentStage: Stage | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const requestRef = useRef(0);

  const [stage, setStage] = useState<Stage>(initialStage);
  const [mode, setMode] = useState<LessonMode>(initialMode);
  const [lesson, setLesson] = useState<StageLesson | null>(initialLesson);
  const [summaries, setSummaries] = useState(lessonSummaries);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const level = ladder.find((item) => item.stage === stage);

  function upsertSummary(next: StageLesson) {
    const summary = toSummary(next);
    setSummaries((current) =>
      [
        ...current.filter(
          (item) => !(item.stage === next.stage && item.mode === next.mode),
        ),
        summary,
      ].sort(
        (a, b) => a.stage - b.stage || a.mode.localeCompare(b.mode),
      ),
    );
  }

  function syncUrl(nextStage: Stage, nextMode: LessonMode) {
    if (typeof window === "undefined") return;
    window.history.replaceState(
      null,
      "",
      `/project/${projectId}/learn?stage=${nextStage}&mode=${nextMode}`,
    );
  }

  async function loadLesson(nextStage: Stage, nextMode: LessonMode) {
    setLesson(null);
    setLoading(true);
    const request = ++requestRef.current;
    try {
      const res = await apiRequest<{ lesson: StageLesson | null }>(
        `/api/projects/${projectId}/lessons/${nextStage}?mode=${nextMode}`,
      );
      if (request !== requestRef.current) return;
      setLesson(res.lesson);
      if (res.lesson) upsertSummary(res.lesson);
    } catch (error) {
      if (request !== requestRef.current) return;
      toast.error(errorMessage(error));
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }

  async function selectStage(next: Stage) {
    if (next === stage || generating) return;
    setStage(next);
    syncUrl(next, mode);
    await loadLesson(next, mode);
  }

  async function selectMode(nextMode: LessonMode) {
    if (nextMode === mode || generating) return;
    setMode(nextMode);
    syncUrl(stage, nextMode);
    await loadLesson(stage, nextMode);
  }

  async function generate(regenerate = false) {
    if (generating) return;
    if (ladder.length === 0) {
      toast.error("请先生成学习阶梯，再生成学习内容。");
      return;
    }
    setGenerating(true);
    try {
      const res = await postJson<{ lesson: StageLesson }>(
        `/api/projects/${projectId}/lessons`,
        { stage, mode, regenerate },
      );
      setLesson(res.lesson);
      upsertSummary(res.lesson);
      toast.success(
        regenerate
          ? "学习内容已重新生成，学习勾选已重置。"
          : "学习内容已生成，重点已经标出来了。",
      );
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerating(false);
    }
  }

  async function toggleSection(index: number) {
    if (!lesson || savingIndex !== null) return;
    const lessonId = lesson.id;
    const previous = lesson.completed;
    const next = previous.includes(index)
      ? previous.filter((item) => item !== index)
      : [...previous, index].sort((a, b) => a - b);

    setLesson({ ...lesson, completed: next });
    setSavingIndex(index);

    try {
      const res = await patchJson<{ lesson: StageLesson }>(
        `/api/projects/${projectId}/lessons/${lesson.stage}`,
        { mode: lesson.mode, completed: next },
      );
      setLesson(res.lesson);
      upsertSummary(res.lesson);
      if (
        res.lesson.plan.sections.length > 0 &&
        res.lesson.completed.length === res.lesson.plan.sections.length
      ) {
        toast.success("这一阶段的内容学完了，去考试验证一下。");
      }
    } catch (error) {
      setLesson((current) =>
        current && current.id === lessonId
          ? { ...current, completed: previous }
          : current,
      );
      toast.error(errorMessage(error));
    } finally {
      setSavingIndex(null);
    }
  }

  function goNextStage() {
    if (stage < 5) {
      void selectStage((stage + 1) as Stage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const stageMeta = STAGE_META[stage];
  const canLearn = Boolean(level);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">
            学习内容
          </h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
            定位之后，按阶段把具体内容真正学一遍：讲解、例子、练习与自测都在这里。
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber">
            <Star size={11} fill="currentColor" />
            带「重点」标记的内容优先掌握
          </p>
        </div>
        <Badge tone="outline">
          {currentStage
            ? `当前定位：${STAGE_META[currentStage].short}`
            : "尚未定位"}
        </Badge>
      </div>

      <div className="grid grid-cols-5 gap-1.5 rounded-xl border border-line bg-paper-deep/50 p-1.5">
        {STAGES.map((item) => {
          const active = item === stage;
          const summary = pickSummary(summaries, item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => selectStage(item)}
              disabled={ladder.length === 0}
              aria-pressed={active}
              title={STAGE_META[item].name}
              className={cn(
                "flex flex-col items-center rounded-lg border px-1 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                active
                  ? "border-accent/25 bg-surface shadow-sm"
                  : "border-transparent hover:bg-surface/60",
              )}
            >
              <span className="flex items-center gap-1 text-[9px] text-muted">
                {item === currentStage ? (
                  <span className="h-1 w-1 rounded-full bg-accent" />
                ) : null}
                阶段 {item}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[11.5px] font-semibold",
                  active ? "text-accent-deep" : "text-ink-soft",
                )}
              >
                {STAGE_META[item].short}
              </span>
              <span
                className={cn(
                  "tabular mt-0.5 text-[9px]",
                  summary ? "text-accent" : "text-muted/60",
                )}
              >
                {summary
                  ? `${summary.completedCount}/${summary.sectionCount} 节`
                  : "未生成"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-line bg-surface p-1.5">
        <div className="flex gap-1 overflow-x-auto">
          {LESSON_MODES.map((item) => {
            const active = item === mode;
            const ready = summaries.some(
              (summary) => summary.stage === stage && summary.mode === item,
            );
            return (
              <button
                key={item}
                type="button"
                onClick={() => selectMode(item)}
                disabled={generating || ladder.length === 0}
                aria-pressed={active}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                  active
                    ? "bg-accent-soft text-accent-deep"
                    : "text-muted hover:bg-paper-deep/60 hover:text-ink",
                )}
              >
                {LESSON_MODE_META[item].name}
                {ready ? (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      active ? "bg-accent" : "bg-accent/35",
                    )}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="px-2.5 pb-1 pt-2 text-[11px] leading-relaxed text-muted">
          <span className="font-medium text-ink-soft">
            {LESSON_MODE_META[mode].name}
          </span>
          ：{LESSON_MODE_META[mode].description}
          <span className="ml-1 text-muted/80">
            切换模式会单独保存各自的进度。
          </span>
        </p>
      </div>

      {ladder.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="先生成学习阶梯"
          description="学习内容按阶段生成。先让 AI 把主题拆成五级，并搞清楚你当前在哪一阶，再回来学具体内容。"
          action={
            <Link
              href={`/project/${projectId}/ladder`}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
            >
              去生成学习阶梯
            </Link>
          }
        />
      ) : generating && !lesson ? (
        <GeneratingCard stage={stage} mode={mode} />
      ) : loading ? (
        <LessonLoading />
      ) : !canLearn ? (
        <EmptyState
          icon={<AlertCircle size={22} />}
          title="这一阶的阶梯信息缺失"
          description="学习内容需要依据对应阶段的掌握项和过关标准来生成。请回到学习阶梯，重新生成完整的 5 级阶梯。"
          action={
            <Link
              href={`/project/${projectId}/ladder`}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
            >
              去检查学习阶梯
            </Link>
          }
        />
      ) : lesson ? (
        <LessonView
          lesson={lesson}
          level={level}
          projectId={projectId}
          savingIndex={savingIndex}
          generating={generating}
          onToggle={toggleSection}
          onRegenerate={() => generate(true)}
          onNextStage={goNextStage}
        />
      ) : (
        <LessonEmpty
          stage={stage}
          mode={mode}
          level={level}
          currentStage={currentStage}
          generating={generating}
          onGenerate={() => generate(false)}
          projectId={projectId}
          stageMeta={stageMeta}
        />
      )}
    </div>
  );
}

function LessonLoading() {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-6 w-2/3" />
        <Skeleton className="mt-2.5 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-4/5" />
        <Skeleton className="mt-4 h-1.5 w-full" />
      </Card>
      <CardSkeleton lines={5} />
    </div>
  );
}

function GeneratingCard({
  stage,
  mode,
}: {
  stage: Stage;
  mode: LessonMode;
}) {
  return (
    <Card className="px-5 py-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Loader2 size={22} className="animate-spin" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">
        AI 正在用「{LESSON_MODE_META[mode].name}」备第 {stage} 阶的课
      </p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted">
        会写 5 节讲解、具体例子和练习，并把真正关键的地方单独标出来。通常需要 20-40 秒。
      </p>
      <div className="mx-auto mt-4 flex max-w-lg flex-wrap justify-center gap-2 text-[11px] text-muted">
        {["拆解阶段要求", "写讲解与例子", "设计练习", "标记重点"].map(
          (item, index) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-paper/60 px-2.5 py-1"
            >
              <span className="tabular text-[9px] text-accent">
                {index + 1}
              </span>
              {item}
            </span>
          ),
        )}
      </div>
    </Card>
  );
}

function LessonEmpty({
  stage,
  mode,
  level,
  currentStage,
  generating,
  onGenerate,
  projectId,
  stageMeta,
}: {
  stage: Stage;
  mode: LessonMode;
  level: LadderLevel | undefined;
  currentStage: Stage | null;
  generating: boolean;
  onGenerate: () => void;
  projectId: string;
  stageMeta: (typeof STAGE_META)[Stage];
}) {
  if (!level) return null;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line/80 bg-paper/40 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{stageMeta.name}</Badge>
          <span className="text-[11px] text-muted">{level.title}</span>
        </div>
        <h3 className="mt-2 text-[18px] font-semibold tracking-tight text-ink">
          第 {stage} 阶还没有「{LESSON_MODE_META[mode].name}」版本
        </h3>
        <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">
          {level.summary} · {LESSON_MODE_META[mode].description}
        </p>
      </div>

      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div>
          <p className="text-[11px] font-semibold text-muted">
            生成后你会得到
          </p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            {[
              "5 节可以直接读的讲解，不是只有标题的大纲",
              "每节配具体例子、动手练习和一道自测题",
              "每节 1-3 个重点、全课 3-5 个重点，单独高亮",
              "学完可以打勾，进度保存在本地",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check
                  size={13}
                  className="mt-1 shrink-0 text-accent"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button loading={generating} onClick={onGenerate}>
              {!generating ? <BookOpen size={15} /> : null}
              用「{LESSON_MODE_META[mode].name}」生成
            </Button>
            <span className="text-[10.5px] text-muted">
              约 20-40 秒，生成后可随时重新生成
            </span>
          </div>

          {currentStage === null ? (
            <p className="mt-3 rounded-lg bg-amber-soft/70 px-3 py-2 text-[11.5px] leading-relaxed text-amber">
              你还没有做阶段定位，默认从第 1 阶开始。做完定位后，系统会优先带你学当前阶段。
            </p>
          ) : currentStage !== stage ? (
            <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[11.5px] leading-relaxed text-muted">
              你当前定位在第 {currentStage} 阶，现在查看的是第 {stage} 阶。
              如果只是想先补基础，也可以从这里开始。
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-line bg-paper/50 px-4 py-3.5">
          <p className="text-[11px] font-semibold text-muted">
            这一阶必须掌握
          </p>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-ink-soft">
            {level.mustMaster.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-line/80 pt-3">
            <p className="text-[10.5px] font-semibold text-muted">过关标准</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
              {level.gateCriteria}
            </p>
          </div>
          <Link
            href={`/project/${projectId}/ladder`}
            className="mt-3 inline-flex text-[11px] font-medium text-accent hover:underline"
          >
            回到学习阶梯查看完整要求
          </Link>
        </div>
      </div>
    </Card>
  );
}
