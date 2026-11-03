"use client";

import {
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, postForm } from "@/lib/client";
import {
  formatBytes,
  SOURCE_ACCEPT,
  sourceFileProblem,
} from "@/lib/source-files";
import {
  PROJECT_PACE_META,
  type Project,
  type ProjectPace,
  type ProjectSource,
} from "@/lib/types";

const MAX_FILES = 6;

const PACES: ProjectPace[] = ["light", "standard", "deep"];

export interface RecentProject {
  id: string;
  topic: string;
  goal: string;
  background: string;
}

export function NewProjectForm({
  recentProjects = [],
}: {
  recentProjects?: RecentProject[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [background, setBackground] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("5");
  const [pace, setPace] = useState<ProjectPace>("standard");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadNote, setUploadNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function applyRecent(project: RecentProject) {
    setTopic(project.topic);
    setGoal(project.goal);
    setBackground(project.background);
    setError("");
  }

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    setError("");
    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of incoming) {
      const problem = sourceFileProblem(file);
      if (problem) {
        problems.push(`「${file.name}」${problem}`);
        continue;
      }
      const duplicate = [...files, ...accepted].some(
        (item) => item.name === file.name && item.size === file.size,
      );
      if (duplicate) continue;
      accepted.push(file);
    }

    const room = MAX_FILES - files.length;
    let selected = accepted;
    if (accepted.length > room) {
      selected = accepted.slice(0, Math.max(0, room));
      problems.push(`一次最多上传 ${MAX_FILES} 份资料`);
    }
    if (selected.length > 0) {
      setFiles((current) => [...current, ...selected]);
      // A book/document can itself be the project. Use its filename as a
      // starting topic when the learner has not typed one yet.
      if (!topic.trim()) {
        setTopic(selected[0].name.replace(/\.[^.]+$/, "").slice(0, 120));
      }
    }
    if (problems.length > 0) setError(problems.join("；"));
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function uploadAll(projectId: string) {
    const failures: string[] = [];
    let uploaded = 0;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setUploadNote(`正在上传资料 ${index + 1}/${files.length}`);
      const form = new FormData();
      form.append("file", file);
      try {
        await postForm<{ source: ProjectSource }>(
          `/api/projects/${projectId}/sources`,
          form,
        );
        uploaded += 1;
      } catch (err) {
        failures.push(`「${file.name}」${errorMessage(err)}`);
      }
    }
    setUploadNote("");
    return { uploaded, failures };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topic.trim()) {
      setError("先写一个想学的主题。");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          goal: goal.trim(),
          background: background.trim(),
          weeklyHours: Number(weeklyHours),
          pace,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(data?.error?.message || "创建失败，请重试。");
      }
      const data = (await res.json()) as { project: Project };

      if (files.length > 0) {
        setUploadNote(`正在上传资料 0/${files.length}`);
        const { uploaded, failures } = await uploadAll(data.project.id);
        if (failures.length > 0) {
          toast.error(
            `项目已创建，${uploaded} 份资料上传成功，${
              failures.length
            } 份失败：${failures.join("；")}`,
          );
        } else {
          toast.success(
            `项目已创建，${uploaded} 份学习资料已加入。先来生成学习阶梯。`,
          );
        }
      } else {
        toast.success("项目已创建，先来生成学习阶梯。");
      }

      router.push(`/project/${data.project.id}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
      setUploadNote("");
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-[0_10px_30px_-24px_rgba(25,25,25,0.45)] sm:p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">
          <Sparkles size={16} />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">
            新建学习项目
          </h2>
          <p className="text-[12px] text-muted">
            越具体，AI 给你的阶梯越准
          </p>
        </div>
      </div>

      {recentProjects.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <span>最近项目：</span>
          {recentProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => applyRecent(project)}
              title="把我最近的项目信息填进表单，稍作修改就能建一个新项目"
              className="max-w-[180px] truncate rounded-full border border-line-strong px-2.5 py-1 transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent-deep"
            >
              {project.topic}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label="学习主题" htmlFor="topic" required>
          <Input
            id="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="例如：TypeScript、数据分析、摄影后期"
            maxLength={120}
            autoComplete="off"
          />
        </Field>

        <Field
          label="你想达到什么程度"
          htmlFor="goal"
          hint="可选"
        >
          <Textarea
            id="goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="例如：能独立做一个可上线的项目，而不是停留在看教程"
            maxLength={500}
            rows={2}
            className="min-h-[70px]"
          />
        </Field>

        <Field label="你的现有基础" htmlFor="background" hint="可选">
          <Textarea
            id="background"
            value={background}
            onChange={(event) => setBackground(event.target.value)}
            placeholder="学过什么、做过什么、卡在哪里"
            maxLength={1200}
            rows={2}
            className="min-h-[70px]"
          />
        </Field>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
            <span className="text-[12px] font-medium text-ink">
              学习资料
              <span className="ml-1.5 font-normal text-muted">可选</span>
            </span>
            <span className="text-[10.5px] text-muted">
              最多 {MAX_FILES} 份 · 每份 ≤20MB
            </span>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            disabled={submitting}
            className={
              dragging
                ? "flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-accent/60 bg-accent-soft/40 px-4 py-4 text-center transition-colors"
                : "flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-line-strong bg-paper/40 px-4 py-4 text-center transition-colors hover:border-accent/40 hover:bg-accent-soft/25 disabled:cursor-not-allowed disabled:opacity-60"
            }
          >
            <Upload size={16} className="text-muted" />
            <span className="text-[12px] font-medium text-ink-soft">
              添加书籍或文档
            </span>
            <span className="text-[10.5px] leading-relaxed text-muted">
              支持 PDF、Markdown、TXT、CSV、JSON，也可以直接拖进来
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={SOURCE_ACCEPT}
            className="hidden"
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />

          {files.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-line/80 bg-paper/40 px-2.5 py-1.5"
                >
                  <FileText size={13} className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-soft">
                    {file.name}
                  </span>
                  <span className="tabular shrink-0 text-[10px] text-muted">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    disabled={submitting}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted transition-colors hover:bg-paper-deep hover:text-danger disabled:opacity-50"
                    aria-label={`移除 ${file.name}`}
                  >
                    <X size={11} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
            书和长文档可以直接当成学习项目：AI 会优先按资料里的范围和术语来生成阶梯与讲解。
          </p>
        </div>

        <div>
          <div className="mb-1.5 text-[12px] font-medium text-ink">
            学习规模
          </div>
          <div className="grid gap-1.5 sm:grid-cols-3">
            {PACES.map((option) => {
              const meta = PROJECT_PACE_META[option];
              const active = pace === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPace(option)}
                  aria-pressed={active}
                  className={
                    active
                      ? "rounded-lg border border-accent/45 bg-accent-soft px-2.5 py-2 text-left"
                      : "rounded-lg border border-line bg-paper/30 px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-paper/60"
                  }
                >
                  <span
                    className={
                      active
                        ? "block text-[12px] font-semibold text-accent-deep"
                        : "block text-[12px] font-medium text-ink-soft"
                    }
                  >
                    {meta.short}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] leading-relaxed text-muted">
                    {option === "light"
                      ? "小课题，1–3 次课"
                      : option === "standard"
                        ? "每阶都有练习"
                        : "多周深入，练得更透"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
            {PROJECT_PACE_META[pace].description}之后也可以在阶梯里按阶调整课时。
          </p>
        </div>

        <Field label="每周投入时间" htmlFor="weeklyHours">
          <Select
            id="weeklyHours"
            value={weeklyHours}
            onChange={(event) => setWeeklyHours(event.target.value)}
          >
            <option value="3">约 3 小时 · 轻量推进</option>
            <option value="5">约 5 小时 · 稳定节奏</option>
            <option value="8">约 8 小时 · 认真投入</option>
            <option value="12">约 12 小时 · 快速突破</option>
            <option value="20">20 小时以上 · 全职冲刺</option>
          </Select>
        </Field>

        {error ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-[12px] leading-relaxed text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" block loading={submitting}>
          {submitting ? uploadNote || "正在创建项目…" : "创建项目"}
          {!submitting ? <ArrowRight size={16} /> : null}
        </Button>
      </form>
    </div>
  );
}
