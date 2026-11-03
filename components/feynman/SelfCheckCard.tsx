"use client";

import { useState } from "react";
import {
  ChevronDown,
  ListChecks,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, postJson } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { SelfCheckSet } from "@/lib/types";

export function SelfCheckCard({
  projectId,
  initial,
}: {
  projectId: string;
  initial: SelfCheckSet | null;
}) {
  const toast = useToast();
  const [set, setSet] = useState<SelfCheckSet | null>(initial);
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState<number[]>([]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const next = await postJson<SelfCheckSet>(
        `/api/projects/${projectId}/feynman/questions`,
      );
      setSet(next);
      setOpen([]);
      toast.success(
        next.meta?.fallback === true
          ? "已按当前阶段内容生成自测题。"
          : "已根据你学过的内容生成自测题。",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerating(false);
    }
  }

  function toggle(index: number) {
    setOpen((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  }

  const questions = set?.questions ?? [];
  const fallback = set?.meta?.fallback === true;

  return (
    <Card>
      <CardHeader
        icon={<ListChecks size={15} />}
        title="学过的内容，自测一下"
        description="AI 会根据你标记为「已学」的节出 3-5 道题；先自己回答，再展开参考答案。"
        action={
          questions.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              loading={generating}
              onClick={handleGenerate}
            >
              {!generating ? <RefreshCw size={13} /> : null}
              换一组
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3 px-5 py-4">
        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-paper/40 px-4 py-6 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
              <Sparkles size={18} />
            </span>
            <p className="mt-2 text-[13px] font-medium text-ink">
              学完一节后，来检查一下
            </p>
            <p className="mx-auto mt-1 max-w-md text-[11.5px] leading-relaxed text-muted">
              题目只来自你的学习内容：概念、因果、应用场景和常见错误。自己先答，再对照参考答案，比重读一遍更能暴露缺口。
            </p>
            <Button className="mt-3" loading={generating} onClick={handleGenerate}>
              {!generating ? <Sparkles size={14} /> : null}
              生成自测题
            </Button>
          </div>
        ) : (
          <>
            {fallback ? (
              <p className="rounded-lg border border-amber/25 bg-amber-soft/50 px-3 py-2 text-[11px] leading-relaxed text-amber">
                你还没有标记「已学」的节，这组题按当前阶段内容生成。学完并勾选后，再点「换一组」会更贴合你的进度。
              </p>
            ) : null}

            <ol className="space-y-2">
              {questions.map((question, index) => {
                const expanded = open.includes(index);
                return (
                  <li
                    key={`${index}-${question.question.slice(0, 24)}`}
                    className="overflow-hidden rounded-xl border border-line bg-surface"
                  >
                    <div className="px-3.5 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className="tabular mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[10.5px] font-semibold text-accent-deep">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-medium leading-relaxed text-ink">
                            {question.question}
                          </p>
                          {question.hint ? (
                            <p className="mt-1 text-[11px] leading-relaxed text-muted">
                              提示：{question.hint}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggle(index)}
                        aria-expanded={expanded}
                        className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-paper/40 px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-ink"
                      >
                        {expanded ? "收起参考答案" : "先自己回答，再展开参考答案"}
                        <ChevronDown
                          size={13}
                          className={cn(
                            "transition-transform",
                            expanded && "rotate-180",
                          )}
                        />
                      </button>

                      {expanded ? (
                        <div className="mt-2 space-y-1.5">
                          <p className="whitespace-pre-wrap rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2 text-[11.5px] leading-relaxed text-ink-soft">
                            {question.answer}
                          </p>
                          <p className="px-1 text-[10px] text-muted">
                            来源：{question.source}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>

            {set?.updatedAt ? (
              <p className="text-[10px] text-muted">
                只保留最新一组自测题；重新生成会替换上一组。
              </p>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}
