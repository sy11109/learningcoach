import {
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  XCircle,
} from "lucide-react";
import type { ExamTurn } from "@/lib/types";
import { cn, optionLetter } from "@/lib/utils";

function scoreColor(score: number) {
  if (score >= 8) return "text-accent";
  if (score >= 5) return "text-amber";
  return "text-danger";
}

function FeedbackList({
  title,
  items,
  tone,
  icon,
}: {
  title: string;
  items: string[];
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line/80 bg-surface px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold">
        <span className={tone}>{icon}</span>
        <span className="text-ink-soft">{title}</span>
      </p>
      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {items.map((item, index) => (
            <li
              key={index}
              className="text-[11.5px] leading-relaxed text-ink-soft"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[11.5px] text-muted/70">没有</p>
      )}
    </div>
  );
}

function ChoiceReview({ turn }: { turn: ExamTurn }) {
  const selectedIndex = turn.answer ? turn.options.indexOf(turn.answer) : -1;
  const correctIndex = turn.correct;

  return (
    <div className="space-y-1.5">
      {turn.options.map((option, index) => {
        const isCorrect = correctIndex !== null && index === correctIndex;
        const isChosen = index === selectedIndex;
        return (
          <div
            key={index}
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] leading-relaxed",
              isCorrect
                ? "border-accent/40 bg-accent-soft/60 text-ink"
                : isChosen
                  ? "border-danger/40 bg-danger-soft/50 text-ink"
                  : "border-line/80 bg-surface text-ink-soft",
            )}
          >
            <span
              className={cn(
                "tabular mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                isCorrect
                  ? "border-accent bg-accent text-white"
                  : isChosen
                    ? "border-danger bg-danger text-white"
                    : "border-line-strong text-muted",
              )}
            >
              {optionLetter(index)}
            </span>
            <span className="min-w-0 flex-1">{option}</span>
            {isCorrect ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-accent" />
            ) : null}
            {isChosen && !isCorrect ? (
              <XCircle size={14} className="mt-0.5 shrink-0 text-danger" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function ExamFeedback({ turn }: { turn: ExamTurn }) {
  const feedback = turn.feedback;
  const score = turn.score ?? 0;
  if (!feedback) return null;

  const isChoice = turn.options.length > 0 && turn.correct !== null;
  const selectedIndex = turn.answer ? turn.options.indexOf(turn.answer) : -1;
  const isCorrect = isChoice && selectedIndex === turn.correct;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-[0_1px_0_rgba(25,25,25,0.02)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted">
            第 {turn.idx + 1} 题 · 难度 {turn.difficulty}/5
          </p>
          <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-ink">
            {turn.question}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("tabular text-3xl font-semibold", scoreColor(score))}>
            {score}
            <span className="ml-0.5 text-[13px] font-normal text-muted">
              /10
            </span>
          </p>
          <p className="text-[10px] text-muted">
            {isChoice
              ? isCorrect
                ? "答对了"
                : "答错了"
              : score >= 7
                ? "基本掌握"
                : score >= 4
                  ? "有缺口，需要补"
                  : "需要补基础"}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {isChoice ? (
          <ChoiceReview turn={turn} />
        ) : (
          <>
            <div className="rounded-lg bg-paper px-3 py-2.5">
              <p className="text-[10.5px] font-medium text-muted">你的回答</p>
              <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-ink-soft">
                {turn.answer}
              </p>
            </div>

            {turn.reference ? (
              <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
                <p className="text-[10.5px] font-medium text-muted">
                  参考答案
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-ink-soft">
                  {turn.reference}
                </p>
              </div>
            ) : null}

            <div className="grid gap-2.5 sm:grid-cols-3">
              <FeedbackList
                title="答对了"
                items={feedback.correct}
                tone="text-accent"
                icon={<CheckCircle2 size={12} />}
              />
              <FeedbackList
                title="漏掉了"
                items={feedback.missing}
                tone="text-amber"
                icon={<CircleAlert size={12} />}
              />
              <FeedbackList
                title="讲错了"
                items={feedback.wrong}
                tone="text-danger"
                icon={<XCircle size={12} />}
              />
            </div>
          </>
        )}

        {feedback.explanation ? (
          <div className="flex gap-2 rounded-lg border border-accent/15 bg-accent-soft/60 px-3 py-2.5">
            <Lightbulb size={14} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="text-[10.5px] font-semibold text-accent-deep">
                {isChoice ? "解析" : "补上这个缺口"}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                {feedback.explanation}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { scoreColor };
