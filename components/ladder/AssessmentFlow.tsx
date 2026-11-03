"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, postJson } from "@/lib/client";
import { cn, formatDate, optionLetter } from "@/lib/utils";
import {
  STAGE_META,
  type StageAssessment,
  type StageResult,
} from "@/lib/types";

export function AssessmentFlow({
  projectId,
  initialAssessment,
  onScored,
}: {
  projectId: string;
  initialAssessment: StageAssessment | null;
  onScored: (result: StageResult) => void;
}) {
  const toast = useToast();
  const [assessment, setAssessment] =
    useState<StageAssessment | null>(initialAssessment);
  const [answers, setAnswers] = useState<Record<string, string>>(
    initialAssessment?.answers ?? {},
  );
  const [index, setIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const questions = useMemo(
    () => assessment?.questions ?? [],
    [assessment],
  );
  const result =
    assessment?.status === "scored" ? assessment.result : null;
  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]?.trim()).length,
    [questions, answers],
  );
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const current = questions[Math.min(index, Math.max(0, questions.length - 1))];

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await postJson<{ assessment: StageAssessment }>(
        `/api/projects/${projectId}/assessment`,
      );
      setAssessment(res.assessment);
      setAnswers({});
      setIndex(0);
      toast.success("定位题已生成，选最符合真实情况的一项。");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit() {
    if (!assessment) return;
    if (!allAnswered) {
      toast.error(`还有 ${questions.length - answeredCount} 道题没答。`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await postJson<{
        assessment: StageAssessment;
        result: StageResult;
      }>(`/api/projects/${projectId}/assessment/submit`, {
        assessmentId: assessment.id,
        answers,
      });
      setAssessment(res.assessment);
      onScored(res.result);
      toast.success(
        `定位完成：你目前处于${STAGE_META[res.result.stage].name}。`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function answer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  return (
    <Card>
      <CardHeader
        icon={<Target size={15} />}
        title="阶段定位"
        description="5 道行为单选题，判断你实际处于五阶段中的哪一阶。"
        action={
          result ? (
            <Badge tone="accent">
              <CheckCircle2 size={11} />
              已完成
            </Badge>
          ) : undefined
        }
      />

      {generating ? (
        <div className="flex items-center gap-3 px-5 py-8">
          <Loader2 size={18} className="animate-spin text-accent" />
          <div>
            <p className="text-[13px] font-medium text-ink">
              AI 正在生成定位题…
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted">
              通常会花 20–40 秒，请不要关闭页面。
            </p>
          </div>
        </div>
      ) : result ? (
        <div className="px-5 py-4">
          <div className="flex items-start gap-4">
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
              style={{
                backgroundColor: `${STAGE_META[result.stage].color}14`,
                color: STAGE_META[result.stage].color,
              }}
            >
              <span className="tabular text-2xl font-semibold">
                {result.stage}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] text-muted">AI 判断你当前处于</p>
              <p className="mt-0.5 text-[17px] font-semibold tracking-tight text-ink">
                {STAGE_META[result.stage].name}
                <span className="ml-2 text-[12px] font-normal text-muted">
                  {STAGE_META[result.stage].tagline}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-muted">
                评估于 {formatDate(assessment?.completedAt)}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              重新定位
            </Button>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold text-muted">判断依据</p>
            <ul className="mt-2 space-y-1.5">
              {result.evidence.map((item, evidenceIndex) => (
                <li
                  key={evidenceIndex}
                  className="flex gap-2 text-[12.5px] leading-relaxed text-ink-soft"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/70" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-lg border border-accent/15 bg-accent-soft/60 px-3.5 py-3">
            <p className="text-[11px] font-semibold text-accent-deep">
              下一步
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              {result.nextStep}
            </p>
          </div>
        </div>
      ) : questions.length > 0 && current ? (
        <div className="px-5 py-4">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="tabular">
              第 {index + 1} / {questions.length} 题
            </span>
            <span className="tabular">{answeredCount} 题已答</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-deep">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{
                width: `${(answeredCount / questions.length) * 100}%`,
              }}
            />
          </div>

          <div className="mt-4 rounded-xl border border-line bg-paper/40 p-4">
            <p className="text-[14px] font-medium leading-relaxed text-ink">
              {current.question}
            </p>
            {current.hint ? (
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                {current.hint}
              </p>
            ) : null}
            {(current.options ?? []).length > 0 ? (
              <div className="mt-3 space-y-2">
                {(current.options ?? []).map((option, optionIndex) => {
                  const active = (answers[current.id] ?? "") === option;
                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      onClick={() => answer(current.id, option)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[12.5px] leading-relaxed transition-colors",
                        active
                          ? "border-accent bg-accent-soft text-ink"
                          : "border-line-strong text-ink-soft hover:border-accent/40 hover:bg-surface",
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
            ) : (
              <Textarea
                value={answers[current.id] ?? ""}
                onChange={(event) => answer(current.id, event.target.value)}
                onKeyDown={(event) => {
                  if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key === "Enter" &&
                    index < questions.length - 1
                  ) {
                    event.preventDefault();
                    setIndex(index + 1);
                  }
                }}
                rows={4}
                maxLength={2000}
                placeholder="按真实情况写，几句话就够。不用查资料，也不用写得漂亮。"
                className="mt-3 bg-surface"
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {questions.map((question, questionIndex) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setIndex(questionIndex)}
                  aria-label={`第 ${questionIndex + 1} 题`}
                  className={cn(
                    "tabular grid h-6 w-6 place-items-center rounded-full text-[10px] transition-colors",
                    questionIndex === index
                      ? "bg-accent text-white"
                      : answers[question.id]?.trim()
                        ? "bg-accent-soft text-accent-deep"
                        : "border border-line-strong text-muted",
                  )}
                >
                  {questionIndex + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
              >
                上一题
              </Button>
              {index < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setIndex((current) =>
                      Math.min(questions.length - 1, current + 1),
                    )
                  }
                >
                  下一题
                  <ArrowRight size={14} />
                </Button>
              ) : (
                <Button
                  size="sm"
                  loading={submitting}
                  disabled={!allAnswered}
                  onClick={handleSubmit}
                >
                  提交并定位
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-right text-[10.5px] text-muted">
            Ctrl / ⌘ + Enter 进入下一题
          </p>
        </div>
      ) : (
        <div className="px-5 py-5">
          <ul className="space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/70" />
              每题 4 个选项，选最接近你真实情况的一项。
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/70" />
              考的是你实际做到过什么，不是你知道多少。
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/70" />
              结果会写回项目，并在阶梯上标出「你在这里」。
            </li>
          </ul>
          <Button className="mt-4" onClick={handleGenerate}>
            开始 5 题定位
            <ArrowRight size={15} />
          </Button>
          <p className="mt-2 text-[11px] text-muted">
            大约 1 分钟。不需要准备，按真实情况选。
          </p>
        </div>
      )}
    </Card>
  );
}
