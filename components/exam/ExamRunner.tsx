"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { ExamFeedback, scoreColor } from "@/components/exam/ExamFeedback";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, postJson } from "@/lib/client";
import { cn, optionLetter } from "@/lib/utils";
import type {
  ExamEvaluation,
  ExamSession,
  ExamSessionDetail,
  ExamTurn,
} from "@/lib/types";

export function ExamRunner({
  initialDetail,
  onFinished,
}: {
  initialDetail: ExamSessionDetail;
  onFinished: (detail: ExamSessionDetail) => void;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState(initialDetail);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [justEvaluated, setJustEvaluated] = useState<ExamTurn | null>(null);
  const [doneFlag, setDoneFlag] = useState(false);

  const session = detail.session;
  const turns = detail.turns;
  const isShort = session.questionType === "short";
  const answered = turns.filter((turn) => turn.answer !== null);
  const pending = turns.find((turn) => turn.answer === null) ?? null;
  const finiteScores = answered
    .map((turn) => turn.score)
    .filter((score): score is number => score !== null);
  const average =
    finiteScores.length > 0
      ? finiteScores.reduce((sum, score) => sum + score, 0) /
        finiteScores.length
      : null;

  async function handleSubmit() {
    if (!pending) return;
    if (isShort) {
      if (answerText.trim().length < 2) {
        toast.error("先用几句话写下你的答案。");
        return;
      }
    } else if (selected === null) {
      toast.error("先选一个答案。");
      return;
    }
    setSubmitting(true);
    try {
      const res = await postJson<
        ExamSessionDetail & { evaluation?: ExamEvaluation; done?: boolean }
      >(`/api/exam/${session.id}/answer`, {
        expectedIdx: pending.idx,
        ...(isShort
          ? { answer: answerText.trim() }
          : { selected: selected ?? undefined }),
      });
      const nextDetail: ExamSessionDetail = {
        session: res.session,
        turns: res.turns,
      };
      setDetail(nextDetail);
      setJustEvaluated(
        res.turns.find((turn) => turn.idx === pending.idx) ?? null,
      );
      const stillPending = res.turns.some((turn) => turn.answer === null);
      setDoneFlag(Boolean(res.done) || !stillPending);
      setSelected(null);
      setAnswerText("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    if (answered.length === 0) {
      toast.error("至少答完一题，才能生成报告。");
      return;
    }
    setFinishing(true);
    try {
      const res = await postJson<{
        session: ExamSession;
        turns: ExamTurn[];
        report: unknown;
      }>(`/api/exam/${session.id}/finish`);
      onFinished({ session: res.session, turns: res.turns });
      toast.success("缺口报告已生成。");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setFinishing(false);
    }
  }

  function continueNext() {
    setJustEvaluated(null);
    setDoneFlag(false);
    setSelected(null);
    setAnswerText("");
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <ClipboardCheck size={15} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ink">AI 考官</p>
            <p className="text-[10.5px] text-muted">
              已答 {answered.length} / {session.maxQuestions} 题 · 当前难度{" "}
              {pending?.difficulty ?? session.difficulty}/5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className={cn(
                "tabular text-[15px] font-semibold",
                average === null
                  ? "text-muted"
                  : average >= 7
                    ? "text-accent"
                    : average >= 5
                      ? "text-amber"
                      : "text-danger",
              )}
            >
              {average === null ? "—" : average.toFixed(1)}
            </p>
            <p className="text-[9.5px] text-muted">当前均分</p>
          </div>
          <ConfirmButton
            size="sm"
            variant="ghost"
            confirmText="确认结束本场？"
            onConfirm={handleFinish}
            loading={finishing}
            disabled={answered.length === 0}
          >
            结束考试
          </ConfirmButton>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {turns.map((turn) => {
            const isCurrent = justEvaluated
              ? justEvaluated.id === turn.id
              : pending?.id === turn.id;
            return (
              <span
                key={turn.id}
                title={
                  turn.score !== null
                    ? `第 ${turn.idx + 1} 题 · ${turn.score}/10`
                    : `第 ${turn.idx + 1} 题 · 待作答`
                }
                className={cn(
                  "tabular grid h-7 w-7 place-items-center rounded-full text-[11px] font-medium",
                  turn.score !== null
                    ? turn.score >= 7
                      ? "bg-accent-soft text-accent-deep"
                      : turn.score >= 4
                        ? "bg-amber-soft text-amber"
                        : "bg-danger-soft text-danger"
                    : "border border-dashed border-line-strong text-muted",
                  isCurrent && "ring-2 ring-accent/40",
                )}
              >
                {turn.score !== null ? (
                  turn.score
                ) : (
                  <span className="text-[10px]">{turn.idx + 1}</span>
                )}
              </span>
            );
          })}
          <span className="ml-1 text-[10.5px] text-muted">
            每个圆点是一道题，数字为得分
          </span>
        </div>

        {justEvaluated ? (
          <div className="mt-4 space-y-3">
            <ExamFeedback turn={justEvaluated} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted">
                {doneFlag
                  ? "本场已达到结束条件，可以查看缺口报告。"
                  : "看清解析，再进入下一题。"}
              </p>
              {doneFlag ? (
                <Button onClick={handleFinish} loading={finishing}>
                  {!finishing ? <ArrowRight size={15} /> : null}
                  生成缺口报告
                </Button>
              ) : (
                <Button onClick={continueNext}>
                  继续下一题
                  <ArrowRight size={15} />
                </Button>
              )}
            </div>
          </div>
        ) : pending ? (
          <div className="mt-4">
            <div className="rounded-xl border border-line bg-paper/40 p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-line-strong px-2 py-0.5 text-[10.5px] text-muted">
                  第 {pending.idx + 1} 题 · {isShort ? "简答题" : "单选题"}
                </span>
                <span className="text-[10.5px] text-muted">
                  难度 {pending.difficulty}/5
                </span>
              </div>
              <p className="mt-2.5 text-[15px] font-medium leading-relaxed text-ink">
                {pending.question}
              </p>

              {isShort ? (
                <Textarea
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  rows={6}
                  maxLength={4000}
                  placeholder="用自己的话写清机制、原因或做法，至少两三句。不要只写结论。"
                  className="mt-3 min-h-[130px]"
                  disabled={submitting}
                />
              ) : (
                <div className="mt-3 space-y-2">
                  {pending.options.map((option, optionIndex) => {
                    const active = selected === optionIndex;
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        onClick={() => setSelected(optionIndex)}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[12.5px] leading-relaxed transition-colors",
                          active
                            ? "border-accent bg-accent-soft text-ink"
                            : "border-line-strong text-ink-soft hover:border-accent/40 hover:bg-paper/60",
                        )}
                      >
                        <span
                          className={cn(
                            "tabular mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                            active
                              ? "border-accent bg-accent text-white"
                              : "border-line-strong text-muted",
                          )}
                        >
                          {optionLetter(optionIndex)}
                        </span>
                        <span className="min-w-0 flex-1">{option}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10.5px] text-muted">
                  {isShort
                    ? "提交后 AI 会按参考答案评分，通常 5–15 秒"
                    : "选一个最符合的答案 · 提交后立刻判分"}
                </p>
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={
                    isShort ? answerText.trim().length < 2 : selected === null
                  }
                >
                  提交答案
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-paper/40 px-5 py-8 text-center">
            <CheckCircle2 size={22} className="text-accent" />
            <p className="mt-2 text-[14px] font-semibold text-ink">
              所有题目都已作答
            </p>
            <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted">
              生成报告会汇总每一题的缺口，并给出 15–60 分钟内能完成的复习动作。
            </p>
            <Button
              className="mt-4"
              onClick={handleFinish}
              loading={finishing}
            >
              生成缺口报告
            </Button>
          </div>
        )}

        {submitting ? (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
            <Loader2 size={12} className="animate-spin" />
            AI 正在准备下一题，通常 5–15 秒。
          </p>
        ) : null}

        {answered.length > 0 && !justEvaluated ? (
          <div className="mt-4 border-t border-line/80 pt-3">
            <p className="text-[10.5px] font-medium text-muted">得分走势</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px]">
              {answered.map((turn) => (
                <span key={turn.id} className="tabular">
                  <span className="text-muted">Q{turn.idx + 1}</span>{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      scoreColor(turn.score ?? 0),
                    )}
                  >
                    {turn.score ?? "—"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
