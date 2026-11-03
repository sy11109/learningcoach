import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Compass,
  KeyRound,
  Layers,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { NewProjectForm } from "@/components/project/NewProjectForm";
import { ProjectCard } from "@/components/project/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { isAiConfigured } from "@/lib/ai/client";
import { listProjects } from "@/lib/repos/projects";

export const dynamic = "force-dynamic";

const METHOD_STEPS = [
  {
    icon: Compass,
    title: "先定位",
    text: "五阶段能力地图，搞清楚自己在哪一阶。",
  },
  {
    icon: BookOpen,
    title: "学内容",
    text: "按阶段读讲解、看例子、做练习，重点单独标出。",
  },
  {
    icon: ClipboardCheck,
    title: "再考核",
    text: "AI 考官逐题追问，暴露真实的知识缺口。",
  },
  {
    icon: MessageSquareQuote,
    title: "最后讲清",
    text: "费曼复述，讲不给孩子听懂就是还没懂。",
  },
];

export default function HomePage() {
  const projects = listProjects();
  const configured = isAiConfigured();

  return (
    <div>
      {!configured ? (
        <Link
          href="/settings"
          className="mb-6 flex items-center gap-3 rounded-xl border border-amber/25 bg-amber-soft px-4 py-3 text-[13px] text-amber transition-colors hover:bg-amber/10"
        >
          <KeyRound size={16} className="shrink-0" />
          <span className="flex-1">
            还没有配置 DeepSeek API Key，AI 功能暂时不可用。
          </span>
          <span className="flex items-center gap-1 font-medium">
            去设置 <ArrowRight size={13} />
          </span>
        </Link>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-[11px] font-medium text-accent-deep">
            <Sparkles size={12} />
            AI 学习教练 · 六步闭环
          </span>
          <h1 className="mt-4 text-[32px] font-semibold leading-[1.18] tracking-tight text-ink sm:text-[42px]">
            把想学的东西，
            <br />
            <span className="text-accent">真正学会。</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
            不是收藏更多教程，而是知道自己现在在第几阶、下一步练什么、有没有真的讲清楚。从一个具体的学习项目开始。
          </p>

          <div className="mt-7 grid max-w-lg gap-2.5 sm:grid-cols-2">
            {METHOD_STEPS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-xl border border-line bg-surface/70 p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent">
                    <step.icon size={14} />
                  </span>
                  <span className="text-[12px] font-semibold text-ink">
                    {index + 1}. {step.title}
                  </span>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-[12px] text-muted">
            数据保存在本地 SQLite，不上传云端。
          </p>
        </div>

        <NewProjectForm
          recentProjects={projects.slice(0, 4).map((project) => ({
            id: project.id,
            topic: project.topic,
            goal: project.goal,
            background: project.background,
          }))}
        />
      </section>

      <section className="mt-14">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-ink">
              我的学习项目
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              每个项目都有自己的阶梯、学习内容、考试记录和费曼对话。
            </p>
          </div>
          {projects.length > 0 ? (
            <span className="tabular shrink-0 text-[12px] text-muted">
              {projects.length} 个项目
            </span>
          ) : null}
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Layers size={22} />}
            title="还没有学习项目"
            description="在上面的表单里写下第一个想学的主题。生成学习阶梯后，你会看到一条从入门到精通的清晰路径。"
          />
        )}
      </section>
    </div>
  );
}
