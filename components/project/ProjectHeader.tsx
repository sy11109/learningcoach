import Link from "next/link";
import { ChevronRight, Clock3 } from "lucide-react";
import { StageBadge } from "@/components/ui/Badge";
import { formatDay } from "@/lib/utils";
import { PROJECT_PACE_META, type Project } from "@/lib/types";

export function ProjectHeader({ project }: { project: Project }) {
  return (
    <div className="animate-rise">
      <div className="flex items-center gap-1 text-[11.5px] text-muted">
        <Link href="/" className="transition-colors hover:text-ink">
          我的项目
        </Link>
        <ChevronRight size={12} />
        <span className="text-ink-soft">{project.topic}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">
            {project.topic}
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
            {project.goal || "还没有写学习目标，先从生成学习阶梯开始。"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={project.currentStage} />
          <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] text-muted">
            {PROJECT_PACE_META[project.pace]?.name ?? PROJECT_PACE_META.standard.name}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] text-muted">
            <Clock3 size={11} />每周 {project.weeklyHours} 小时
          </span>
          <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] text-muted">
            {formatDay(project.createdAt)} 创建
          </span>
        </div>
      </div>
    </div>
  );
}
