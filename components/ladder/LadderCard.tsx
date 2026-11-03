"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Flag,
  Pencil,
  Timer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, patchJson } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { LadderLevel } from "@/lib/types";

interface Draft {
  title: string;
  summary: string;
  mustMaster: string;
  commonMistakes: string;
  gateCriteria: string;
  practice: string;
  estimatedSessions: string;
  estimatedHours: string;
  estimatedWeeks: string;
}

function numberToDraft(value: number | null): string {
  return value === null ? "" : String(value);
}

function toDraft(level: LadderLevel): Draft {
  return {
    title: level.title,
    summary: level.summary,
    mustMaster: level.mustMaster.join("\n"),
    commonMistakes: level.commonMistakes.join("\n"),
    gateCriteria: level.gateCriteria,
    practice: level.practice,
    estimatedSessions: numberToDraft(level.estimatedSessions),
    estimatedHours: numberToDraft(level.estimatedHours),
    estimatedWeeks: numberToDraft(level.estimatedWeeks),
  };
}

/** null = 未设置；0 = 检查点 */
function parseEstimate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function estimateChips(level: LadderLevel): string[] {
  const hasAny =
    level.estimatedSessions !== null ||
    level.estimatedHours !== null ||
    level.estimatedWeeks !== null;
  if (!hasAny) return ["未设置课时"];

  const parts: string[] = [];
  if (level.estimatedSessions === 0) {
    parts.push("检查点 · 随前阶带过");
  } else if (level.estimatedSessions !== null) {
    parts.push(`约 ${level.estimatedSessions} 次课`);
  }
  if (level.estimatedHours !== null && level.estimatedHours > 0) {
    parts.push(`${level.estimatedHours} 小时`);
  }
  if (level.estimatedWeeks !== null && level.estimatedWeeks > 0) {
    parts.push(`${level.estimatedWeeks} 周`);
    if (level.estimatedHours !== null && level.estimatedHours > 0) {
      const perWeek = Math.round((level.estimatedHours / level.estimatedWeeks) * 10) / 10;
      parts.push(`每周约 ${perWeek} 小时`);
    }
  }
  return parts.length > 0 ? parts : ["未设置课时"];
}

function toLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function LadderCard({
  level,
  projectId,
  isCurrent,
  onSaved,
}: {
  level: LadderLevel;
  projectId: string;
  isCurrent: boolean;
  onSaved: (level: LadderLevel) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(level));

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!draft.title.trim()) {
      toast.error("标题不能为空。");
      return;
    }
    const mustMaster = toLines(draft.mustMaster);
    if (mustMaster.length === 0) {
      toast.error("至少写一条「要能做到」，否则这一级无法验收。");
      return;
    }
    const estimatedSessions = parseEstimate(draft.estimatedSessions);
    const estimatedHours = parseEstimate(draft.estimatedHours);
    const estimatedWeeks = parseEstimate(draft.estimatedWeeks);
    if (
      Number.isNaN(estimatedSessions) ||
      Number.isNaN(estimatedHours) ||
      Number.isNaN(estimatedWeeks)
    ) {
      toast.error("课时估算请填数字，留空表示未设置。");
      return;
    }
    setSaving(true);
    try {
      const res = await patchJson<{ level: LadderLevel }>(
        `/api/projects/${projectId}/ladder/${level.id}`,
        {
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          mustMaster,
          commonMistakes: toLines(draft.commonMistakes),
          gateCriteria: draft.gateCriteria.trim(),
          practice: draft.practice.trim(),
          estimatedSessions,
          estimatedHours,
          estimatedWeeks,
        },
      );
      onSaved(res.level);
      setEditing(false);
      toast.success("这一级已保存。");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(toDraft(level));
    setEditing(false);
  }

  if (editing) {
    return (
      <Card className={cn(isCurrent && "border-accent/40")}>
        <div className="flex items-center justify-between border-b border-line/80 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-[12px] font-semibold text-white">
              {level.stage}
            </span>
            <span className="text-[13px] font-semibold text-ink">
              编辑阶段 {level.stage}
            </span>
          </div>
          <span className="text-[11px] text-muted">
            每行一条，空行会被忽略
          </span>
        </div>

        <div className="space-y-3.5 px-5 py-4">
          <Field label="标题" htmlFor={`title-${level.id}`}>
            <Input
              id={`title-${level.id}`}
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              maxLength={120}
            />
          </Field>

          <Field label="一句话描述这一阶的状态" htmlFor={`summary-${level.id}`}>
            <Textarea
              id={`summary-${level.id}`}
              value={draft.summary}
              onChange={(event) => update("summary", event.target.value)}
              rows={2}
              maxLength={400}
            />
          </Field>

          <Field
            label="要能做到（可验证、可观察）"
            htmlFor={`must-${level.id}`}
          >
            <Textarea
              id={`must-${level.id}`}
              value={draft.mustMaster}
              onChange={(event) => update("mustMaster", event.target.value)}
              rows={5}
            />
          </Field>

          <Field label="常见坑（每行一条）" htmlFor={`mistakes-${level.id}`}>
            <Textarea
              id={`mistakes-${level.id}`}
              value={draft.commonMistakes}
              onChange={(event) => update("commonMistakes", event.target.value)}
              rows={3}
            />
          </Field>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="过关标准" htmlFor={`gate-${level.id}`}>
              <Textarea
                id={`gate-${level.id}`}
                value={draft.gateCriteria}
                onChange={(event) => update("gateCriteria", event.target.value)}
                rows={3}
                maxLength={1000}
              />
            </Field>
            <Field label="30 分钟练习" htmlFor={`practice-${level.id}`}>
              <Textarea
                id={`practice-${level.id}`}
                value={draft.practice}
                onChange={(event) => update("practice", event.target.value)}
                rows={3}
                maxLength={1000}
              />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink">
              课时估算
              <span className="ml-1.5 font-normal text-muted">
                留空 = 未设置 · 0 次课 = 检查点
              </span>
            </p>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="次课" htmlFor={`sessions-${level.id}`}>
                <Input
                  id={`sessions-${level.id}`}
                  type="number"
                  min={0}
                  max={40}
                  step={1}
                  value={draft.estimatedSessions}
                  onChange={(event) =>
                    update("estimatedSessions", event.target.value)
                  }
                  placeholder="例如 2"
                />
              </Field>
              <Field label="总小时" htmlFor={`hours-${level.id}`}>
                <Input
                  id={`hours-${level.id}`}
                  type="number"
                  min={0}
                  max={500}
                  step={0.5}
                  value={draft.estimatedHours}
                  onChange={(event) =>
                    update("estimatedHours", event.target.value)
                  }
                  placeholder="例如 6"
                />
              </Field>
              <Field label="跨几周" htmlFor={`weeks-${level.id}`}>
                <Input
                  id={`weeks-${level.id}`}
                  type="number"
                  min={0}
                  max={52}
                  step={0.5}
                  value={draft.estimatedWeeks}
                  onChange={(event) =>
                    update("estimatedWeeks", event.target.value)
                  }
                  placeholder="例如 1.5"
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X size={14} />
              取消
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {!saving ? <Check size={14} /> : null}
              保存修改
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow",
        isCurrent && "border-accent/35 ring-1 ring-accent/10",
      )}
    >
      <div className="flex items-start gap-3 px-5 py-4">
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular",
            isCurrent
              ? "bg-accent text-white ring-4 ring-accent/10"
              : "bg-paper-deep text-muted",
          )}
        >
          {level.stage}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">
              {level.title}
            </h3>
            {isCurrent ? (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-deep">
                你在这里
              </span>
            ) : null}
          </div>
          {level.summary ? (
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              {level.summary}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {estimateChips(level).map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-paper/50 px-2 py-0.5 text-[10.5px] text-muted"
              >
                <Timer size={10} />
                {chip}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setDraft(toDraft(level));
            setEditing(true);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-paper-deep hover:text-ink"
          aria-label={`编辑阶段 ${level.stage}`}
        >
          <Pencil size={14} />
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line/80 px-5 py-3.5">
        <div className="flex min-w-0 gap-2">
          <Flag size={13} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="text-[10.5px] font-medium text-muted">过关标准</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
              {level.gateCriteria || "还没有写过关标准。"}
            </p>
          </div>
        </div>
        <Link
          href={`/project/${projectId}/learn?stage=${level.stage}`}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-medium text-ink transition-colors hover:border-accent/35 hover:text-accent"
        >
          去学这一阶
          <ArrowRight size={13} />
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border-t border-line/80 bg-paper/40 px-5 py-2.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink"
      >
        {open ? "收起详情" : "展开：要能做到、常见坑、练习"}
        <ChevronDown
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="border-t border-line/80">
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <section>
              <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-deep">
                <Check size={12} />
                要能做到
              </h4>
              <ul className="mt-2 space-y-1.5">
                {level.mustMaster.map((item, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-[12px] leading-relaxed text-ink-soft"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-amber">
                <CircleAlert size={12} />
                常见坑
              </h4>
              <ul className="mt-2 space-y-1.5">
                {level.commonMistakes.map((item, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-[12px] leading-relaxed text-ink-soft"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="flex gap-2 border-t border-line/80 bg-paper/50 px-5 py-3">
            <Timer size={13} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="text-[10.5px] font-medium text-muted">
                30 分钟练习
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                {level.practice || "还没有写练习。"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
