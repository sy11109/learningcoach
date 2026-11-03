"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Layers, Sparkles } from "lucide-react";
import { AssessmentFlow } from "@/components/ladder/AssessmentFlow";
import { LadderCard } from "@/components/ladder/LadderCard";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, postJson } from "@/lib/client";
import type {
  LadderLevel,
  Stage,
  StageAssessment,
  StageResult,
} from "@/lib/types";

export function LadderBoard({
  projectId,
  topic,
  initialLevels,
  initialAssessment,
  initialStage,
}: {
  projectId: string;
  topic: string;
  initialLevels: LadderLevel[];
  initialAssessment: StageAssessment | null;
  initialStage: Stage | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [levels, setLevels] = useState(initialLevels);
  const [currentStage, setCurrentStage] = useState<Stage | null>(initialStage);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await postJson<{ levels: LadderLevel[] }>(
        `/api/projects/${projectId}/ladder`,
      );
      setLevels(res.levels);
      toast.success("学习阶梯已生成，所有内容都可以逐条修改。");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerating(false);
    }
  }

  function handleSaved(updated: LadderLevel) {
    setLevels((current) =>
      current.map((level) => (level.id === updated.id ? updated : level)),
    );
    router.refresh();
  }

  function handleScored(result: StageResult) {
    setCurrentStage(result.stage);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">
            学习阶梯
          </h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
            阶梯只用来定位和验收：做到什么、怎样算过关。具体讲解、例子和练习都在「学习内容」里。
          </p>
        </div>
        {levels.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/project/${projectId}/learn?stage=${currentStage ?? 1}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-white transition-colors hover:bg-accent-deep"
            >
              <BookOpen size={14} />
              去学习内容
              <ArrowRight size={13} />
            </Link>
            {generating ? (
              <Button variant="secondary" loading>
                正在重新生成
              </Button>
            ) : (
              <ConfirmButton
                onConfirm={handleGenerate}
                confirmText="确认覆盖现有阶梯？"
                variant="secondary"
                size="sm"
              >
                重新生成
              </ConfirmButton>
            )}
          </div>
        ) : null}
      </div>

      {generating ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((stage) => (
            <div
              key={stage}
              className="rounded-card border border-line bg-surface p-5"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          ))}
          <p className="text-center text-[12px] text-muted">
            AI 正在把「{topic}」拆成五个阶段，通常需要 30–60 秒…
          </p>
        </div>
      ) : levels.length === 0 ? (
        <EmptyState
          icon={<Layers size={22} />}
          title="还没有学习阶梯"
          description="先花 30-60 秒生成一份简洁的五级路径：每级只写要能做到什么、怎样算过关。具体学习内容稍后按阶段生成。"
          action={
            <Button onClick={handleGenerate}>
              <Sparkles size={15} />
              生成学习阶梯
            </Button>
          }
        />
      ) : (
        <>
          <AssessmentFlow
            projectId={projectId}
            initialAssessment={initialAssessment}
            onScored={handleScored}
          />

          <div className="space-y-3">
            {levels.map((level) => (
              <LadderCard
                key={level.id}
                level={level}
                projectId={projectId}
                isCurrent={currentStage === level.stage}
                onSaved={handleSaved}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
