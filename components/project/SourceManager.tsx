"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { useToast } from "@/components/ui/Toast";
import {
  apiRequest,
  errorMessage,
  postForm,
} from "@/lib/client";
import {
  SOURCE_ACCEPT,
  sourceFileProblem,
} from "@/lib/source-files";
import { relativeTime } from "@/lib/utils";
import type { ProjectSource } from "@/lib/types";

export function SourceManager({
  projectId,
  initialSources,
}: {
  projectId: string;
  initialSources: ProjectSource[];
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState(initialSources);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  async function uploadFiles(files: File[]) {
    if (uploading || files.length === 0) return;
    setNotice("");

    const accepted: File[] = [];
    const problems: string[] = [];
    for (const file of files) {
      const problem = sourceFileProblem(file);
      if (problem) problems.push(`「${file.name}」${problem}`);
      else accepted.push(file);
    }
    if (accepted.length === 0) {
      const message = problems.join("；");
      setNotice(message);
      toast.error(message);
      return;
    }

    setUploading(true);
    const added: ProjectSource[] = [];
    const failures: string[] = [...problems];
    try {
      for (let index = 0; index < accepted.length; index += 1) {
        const file = accepted[index];
        setProgress(`${index + 1}/${accepted.length}`);
        const form = new FormData();
        form.append("file", file);
        try {
          const res = await postForm<{ source: ProjectSource }>(
            `/api/projects/${projectId}/sources`,
            form,
          );
          added.push(res.source);
        } catch (error) {
          failures.push(`「${file.name}」${errorMessage(error)}`);
        }
      }

      if (added.length > 0) {
        setSources((current) => [...current, ...added]);
        toast.success(`已上传 ${added.length} 份学习资料。`);
        router.refresh();
      }
      if (failures.length > 0) {
        const message = `${failures.length} 份没有上传成功：${failures.join(
          "；",
        )}`;
        setNotice(message);
        toast.error(message);
      }
    } finally {
      setUploading(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  async function removeSource(source: ProjectSource) {
    setRemovingId(source.id);
    try {
      await apiRequest(
        `/api/projects/${projectId}/sources/${source.id}`,
        { method: "DELETE" },
      );
      setSources((current) =>
        current.filter((item) => item.id !== source.id),
      );
      toast.success(`已移除「${source.name}」。`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Card
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={dragging ? "border-accent/50 bg-accent-soft/20" : undefined}
    >
      <CardHeader
        icon={<Upload size={15} />}
        title="学习资料"
        description="上传书籍或文档，生成阶梯和讲解时会优先依据这些资料。"
        action={
          <Button
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={openPicker}
          >
            {uploading ? `上传中 ${progress}` : "上传资料"}
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={SOURCE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          void uploadFiles(Array.from(event.target.files ?? []));
        }}
      />

      <div className="px-5 py-4">
        {sources.length === 0 ? (
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-line-strong bg-paper/50 px-4 py-5 text-center transition-colors hover:border-accent/40 hover:bg-accent-soft/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText size={18} className="text-muted" />
            <span className="text-[12.5px] font-medium text-ink-soft">
              还没有学习资料
            </span>
            <span className="text-[11px] leading-relaxed text-muted">
              点击或把文件拖到这里。支持 PDF、Markdown、TXT、CSV、JSON，单份 ≤20MB。
            </span>
          </button>
        ) : (
          <ul className="space-y-1.5">
            {sources.map((source) => (
              <li
                key={source.id}
                className="flex items-center gap-2.5 rounded-lg border border-line/80 bg-paper/40 px-3 py-2"
              >
                <FileText size={14} className="shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink-soft">
                    {source.name}
                  </p>
                  <p className="tabular mt-0.5 text-[10.5px] text-muted">
                    {source.charCount.toLocaleString()} 字 ·{" "}
                    {relativeTime(source.createdAt)}
                  </p>
                </div>
                <ConfirmButton
                  onConfirm={() => void removeSource(source)}
                  confirmText="确认移除？"
                  resetAfter={4000}
                  variant="ghost"
                  size="sm"
                  loading={removingId === source.id}
                  disabled={removingId !== null}
                  className="h-7 shrink-0 gap-1 px-2 text-[11px] text-muted hover:text-danger"
                  title="移除后，之后生成的内容不会再参考这份资料"
                  aria-label={`移除 ${source.name}`}
                >
                  <Trash2 size={12} />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}

        {sources.length > 0 ? (
          <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
            也可以直接把文件拖进这张卡片。重新生成阶梯或学习内容时会重新读取资料。
          </p>
        ) : null}

        {notice ? (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[11.5px] leading-relaxed text-danger">
            {notice}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
