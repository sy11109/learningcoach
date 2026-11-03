import Link from "next/link";
import { ArrowUpRight, Quote } from "lucide-react";
import { DeleteProjectButton } from "@/components/project/DeleteProjectButton";
import { Badge, StageBadge } from "@/components/ui/Badge";
import { relativeTime } from "@/lib/utils";
import type { ProjectSummary } from "@/lib/types";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <div className="group flex flex-col rounded-card border border-line bg-surface transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_14px_30px_-24px_rgba(14,107,82,0.5)]">
      <Link
        href={`/project/${project.id}`}
        className="flex flex-1 flex-col p-5 pb-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-semibold tracking-tight text-ink">
              {project.topic}
            </h3>
            <p className="mt-1 line-clamp-2 min-h-[38px] text-[13px] leading-relaxed text-muted">
              {project.goal || "还没有写学习目标，可以随时补充。"}
            </p>
          </div>
          <ArrowUpRight
            size={17}
            className="mt-0.5 shrink-0 text-muted/60 transition-colors group-hover:text-accent"
          />
        </div>

        <div className="mt-3">
          <StageBadge stage={project.currentStage} />
        </div>

        <dl className="mt-4 grid grid-cols-4 gap-1.5 border-t border-line/80 pt-3 text-center">
          <div>
            <dt className="text-[10px] text-muted">阶梯</dt>
            <dd className="tabular mt-0.5 text-[12.5px] font-medium text-ink-soft">
              {project.ladderCount}/5
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted">内容</dt>
            <dd className="tabular mt-0.5 text-[12.5px] font-medium text-ink-soft">
              {project.lessonCount} 阶
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted">考试</dt>
            <dd className="tabular mt-0.5 text-[12.5px] font-medium text-ink-soft">
              {project.examCount} 场
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted">费曼</dt>
            <dd className="tabular mt-0.5 text-[12.5px] font-medium text-ink-soft">
              {project.feynmanPassed} 个
            </dd>
          </div>
        </dl>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-line/60 px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted">
          <span className="truncate">
            更新于 {relativeTime(project.updatedAt)}
          </span>
          {project.feynmanActive > 0 ? (
            <Badge tone="amber">
              <Quote size={10} />
              {project.feynmanActive} 个进行中
            </Badge>
          ) : null}
        </div>
        <DeleteProjectButton
          projectId={project.id}
          topic={project.topic}
        />
      </div>
    </div>
  );
}
