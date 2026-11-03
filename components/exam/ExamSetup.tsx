"use client";

import { useState } from "react";
import { ClipboardCheck, Play, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, postJson } from "@/lib/client";
import { cn } from "@/lib/utils";
import type {
  ExamQuestionType,
  ExamSessionDetail,
} from "@/lib/types";

const QUESTION_OPTIONS = [5, 6, 8, 10, 12];
const DIFFICULTY_LABELS: Record<number, string> = {
  1: "概念",
  2: "基础",
  3: "应用",
  4: "取舍",
  5: "深入",
};

export function ExamSetup({
  projectId,
  onStarted,
  initialFocus = "",
  initialQuestionType = "choice",
  initialDifficulty = 1,
}: {
  projectId: string;
  onStarted: (detail: ExamSessionDetail) => void;
  initialFocus?: string;
  initialQuestionType?: ExamQuestionType;
  initialDifficulty?: number;
}) {
  const toast = useToast();
  const [maxQuestions, setMaxQuestions] = useState(8);
  const [questionType, setQuestionType] =
    useState<ExamQuestionType>(initialQuestionType);
  const [startDifficulty, setStartDifficulty] = useState(
    Math.min(5, Math.max(1, initialDifficulty)),
  );
  const [focus, setFocus] = useState(initialFocus);
  const [submitting, setSubmitting] = useState(false);
  const isShort = questionType === "short";

  async function handleStart() {
    setSubmitting(true);
    try {
      const res = await postJson<
        ExamSessionDetail & { existing?: boolean }
      >(`/api/projects/${projectId}/exam`, {
        maxQuestions,
        startDifficulty,
        focus: focus.trim(),
        questionType,
      });
      onStarted({ session: res.session, turns: res.turns });
      toast.success(
        res.existing
          ? "有一场未完成的考试，已为你恢复。"
          : isShort
            ? "考试开始。先写清机制和原因，再提交。"
            : "考试开始。看清题目，选一个最符合的答案。",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader
        icon={<ClipboardCheck size={15} />}
        title="开始一场考试"
        description={
          isShort
            ? "一次一题简答题，按参考答案评分；难度会跟着你的表现调整。"
            : "一次一题单选题，答完立刻判分；难度会跟着你的表现调整。"
        }
      />

      <div className="space-y-4 px-5 py-4">
        <Field label="题型" hint="一场考试内保持不变">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {(
              [
                {
                  value: "choice" as const,
                  title: "单选题",
                  text: "4 个选项，答对 10 分、答错 0 分，适合快速查漏。",
                },
                {
                  value: "short" as const,
                  title: "简答题",
                  text: "自己写答案，AI 按参考答案给 0-10 分，适合讲清机制。",
                },
              ]
            ).map((option) => {
              const active = questionType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setQuestionType(option.value)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-accent bg-accent-soft"
                      : "border-line-strong hover:border-accent/40 hover:bg-paper/60",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[12.5px] font-semibold",
                      active ? "text-accent-deep" : "text-ink-soft",
                    )}
                  >
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] leading-relaxed text-muted">
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="本次题数上限" hint="可提前结束">
          <div className="grid grid-cols-5 gap-1.5">
            {QUESTION_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setMaxQuestions(count)}
                className={cn(
                  "tabular h-9 rounded-lg border text-[12px] transition-colors",
                  maxQuestions === count
                    ? "border-accent bg-accent-soft font-semibold text-accent-deep"
                    : "border-line-strong text-muted hover:border-accent/40 hover:text-ink",
                )}
              >
                {count} 题
              </button>
            ))}
          </div>
        </Field>

        <Field label="起始难度" hint="答得好会自动加难">
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setStartDifficulty(level)}
                className={cn(
                  "flex h-11 flex-col items-center justify-center rounded-lg border text-[11px] transition-colors",
                  startDifficulty === level
                    ? "border-accent bg-accent-soft font-semibold text-accent-deep"
                    : "border-line-strong text-muted hover:border-accent/40 hover:text-ink",
                )}
              >
                <span className="tabular text-[13px] font-semibold">
                  {level}
                </span>
                <span>{DIFFICULTY_LABELS[level]}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="聚焦范围" htmlFor="exam-focus" hint="可选">
          <Input
            id="exam-focus"
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            placeholder="例如：类型收窄、异步错误处理、索引优化"
            maxLength={200}
          />
        </Field>

        <div className="rounded-lg border border-line bg-paper/50 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <ShieldQuestion size={12} />
            考试规则
          </p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-muted">
            {isShort ? (
              <>
                <li>· 一次只出一道题，用自己的话写清机制、原因或做法。</li>
                <li>
                  · AI 按参考答案给 0-10 分，7 分及以上算掌握；连续两题不超过 3
                  分会提前结束。
                </li>
              </>
            ) : (
              <>
                <li>· 一次只出一道题，每题 4 个选项，有且只有一个正确答案。</li>
                <li>
                  · 答对得 10 分，答错得 0 分；连续两题答错会提前结束。
                </li>
              </>
            )}
            <li>· 中途离开没关系，刷新页面可以继续。</li>
          </ul>
        </div>

        <Button
          block
          size="lg"
          loading={submitting}
          onClick={handleStart}
        >
          {!submitting ? <Play size={16} /> : null}
          开始考试
        </Button>
      </div>
    </Card>
  );
}
