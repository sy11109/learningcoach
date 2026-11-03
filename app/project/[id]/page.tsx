import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  Compass,
  Layers,
  MessageSquareQuote,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { ActivityList } from "@/components/project/ActivityList";
import { ModuleCard } from "@/components/project/ModuleCard";
import { NextStepCard } from "@/components/project/NextStepCard";
import { SourceManager } from "@/components/project/SourceManager";
import { StageTrack } from "@/components/project/StageTrack";
import { Card, CardHeader } from "@/components/ui/Card";
import { getRecentActivity } from "@/lib/repos/activity";
import { listLessonSummaries } from "@/lib/repos/lessons";
import { getProjectSummary } from "@/lib/repos/projects";
import { listSources } from "@/lib/repos/sources";
import {
  LESSON_MODE_META,
  STAGE_META,
  type LessonSummary,
  type ProjectSummary,
  type Stage,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface NextStep {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}

/** Prefer a finished mode, then the most recently touched one. */
function pickStageLesson(
  lessons: LessonSummary[],
  stage: Stage,
): LessonSummary | undefined {
  return lessons
    .filter((lesson) => lesson.stage === stage)
    .sort((a, b) => {
      const aDone =
        a.sectionCount > 0 && a.completedCount >= a.sectionCount;
      const bDone =
        b.sectionCount > 0 && b.completedCount >= b.sectionCount;
      if (aDone !== bDone) return aDone ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    })[0];
}

function getNextStep(
  project: ProjectSummary,
  lessons: LessonSummary[],
): NextStep {
  const base = `/project/${project.id}`;
  if (project.ladderCount < 5) {
    return {
      icon: Layers,
      eyebrow: "第 1 步 · 学习阶梯",
      title: "先生成学习阶梯",
      description: `把「${project.topic}」拆成五个可以验证的阶段。每一级都写清楚要能做什么、常见的坑，以及过关标准。`,
      href: `${base}/ladder`,
      cta: project.ladderCount > 0 ? "查看阶梯" : "去生成阶梯",
    };
  }
  if (project.assessmentCount === 0) {
    return {
      icon: Compass,
      eyebrow: "第 2 步 · 阶段定位",
      title: "做一次阶段定位",
      description:
        "5 道行为单选题，不看你知道多少，只看你实际做到过什么。AI 会给出当前阶段、证据和下一步。",
      href: `${base}/ladder`,
      cta: "开始定位",
    };
  }
  const stage = project.currentStage ?? 1;
  const stageLesson = pickStageLesson(lessons, stage);
  const lessonDone = Boolean(
    stageLesson &&
      stageLesson.sectionCount > 0 &&
      stageLesson.completedCount >= stageLesson.sectionCount,
  );

  if (!stageLesson) {
    return {
      icon: BookOpen,
      eyebrow: "第 3 步 · 学习内容",
      title: `开始学第 ${stage} 阶的具体内容`,
      description:
        "先把这一阶段的讲解、例子和练习真正过一遍。关键内容会单独标成「重点」，学完再去考试。",
      href: `${base}/learn?stage=${stage}`,
      cta: "去学内容",
    };
  }
  if (!lessonDone) {
    const remaining = stageLesson.sectionCount - stageLesson.completedCount;
    return {
      icon: BookOpen,
      eyebrow: "第 3 步 · 学习内容",
      title: "把这一阶段的内容学完",
      description: `第 ${stage} 阶还剩 ${remaining} 节没学完。先读讲解、做练习，学完再去让 AI 考官验证。`,
      href: `${base}/learn?stage=${stage}&mode=${stageLesson.mode}`,
      cta: "继续学习",
    };
  }
  if (project.examCount === 0) {
    return {
      icon: ClipboardCheck,
      eyebrow: "第 4 步 · AI 考官",
      title: "让 AI 考官考考你",
      description:
        "一次一题，可选单选或简答；答完立刻判分，难度跟着你的表现调整。结束后会得到一份缺口报告：哪些是真会，哪些只是看着眼熟。",
      href: `${base}/exam`,
      cta: "开始考试",
    };
  }
  if ((project.examAvg ?? 0) < 7) {
    return {
      icon: Target,
      eyebrow: "查漏补缺",
      title: "针对缺口再考一次",
      description: `最近考试均分 ${project.examAvg?.toFixed(1) ?? "—"} 分。先按上次的复习计划补上缺口，再回来验证一次。`,
      href: `${base}/exam`,
      cta: "再考一次",
    };
  }
  if (project.feynmanPassed === 0) {
    return {
      icon: MessageSquareQuote,
      eyebrow: "第 5 步 · 费曼反馈",
      title: "选一个概念讲给自己听",
      description:
        "让 AI 用 12 岁孩子能听懂的话讲一遍，然后你复述回去。讲不清的地方，就是还没懂的地方。",
      href: `${base}/feynman`,
      cta: "开始费曼",
    };
  }
  if (project.currentStage && project.currentStage < 5) {
    const nextStage = (project.currentStage + 1) as Stage;
    const nextLesson = pickStageLesson(lessons, nextStage);
    if (!nextLesson) {
      return {
        icon: BookOpen,
        eyebrow: "进入下一阶",
        title: `开始学第 ${nextStage} 阶`,
        description:
          "你已经通过了这一阶段的验证。下一步是学下一阶段的具体内容，而不是重复刷题。",
        href: `${base}/learn?stage=${nextStage}`,
        cta: "学下一阶",
      };
    }
    if (nextLesson.completedCount < nextLesson.sectionCount) {
      return {
        icon: BookOpen,
        eyebrow: "进入下一阶",
        title: `继续学第 ${nextStage} 阶`,
        description: `下一阶段的内容已经准备好，还剩 ${
          nextLesson.sectionCount - nextLesson.completedCount
        } 节。学完再回到考试，验证迁移能力。`,
        href: `${base}/learn?stage=${nextStage}&mode=${nextLesson.mode}`,
        cta: "继续学习",
      };
    }
  }
  return {
    icon: Trophy,
    eyebrow: "保持节奏",
    title: "再讲清一个概念",
    description:
      "你已经通过了一次费曼检验。挑一个最近答错或讲不顺的概念，再走一轮讲解 → 复述 → 点评。",
    href: `${base}/feynman`,
    cta: "继续练习",
  };
}

export default async function ProjectDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProjectSummary(id);
  if (!project) notFound();

  const activity = getRecentActivity(id, 6);
  const lessons = listLessonSummaries(id);
  const sources = listSources(id);
  const next = getNextStep(project, lessons);
  const stageMeta = project.currentStage
    ? STAGE_META[project.currentStage]
    : null;
  const nextStage = (project.currentStage
    ? Math.min(5, project.currentStage + 1)
    : 1) as Stage;
  const learnStage = project.currentStage ?? 1;
  const activeLesson = pickStageLesson(lessons, learnStage);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div className="space-y-4">
          <NextStepCard
            icon={next.icon}
            eyebrow={next.eyebrow}
            title={next.title}
            description={next.description}
            href={next.href}
            cta={next.cta}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <ModuleCard
              href={`/project/${id}/ladder`}
              icon={Layers}
              title="学习阶梯"
              description="五级可验证的能力路径，每一级都有过关标准。"
              stat={
                project.ladderCount >= 5
                  ? "5 级阶梯已就绪"
                  : project.ladderCount > 0
                    ? `${project.ladderCount}/5 级，建议重新生成`
                    : "尚未生成"
              }
            />
            <ModuleCard
              href={
                activeLesson
                  ? `/project/${id}/learn?stage=${learnStage}&mode=${activeLesson.mode}`
                  : `/project/${id}/learn?stage=${learnStage}`
              }
              icon={BookOpen}
              title="学习内容"
              description="按阶段读讲解、例子和练习，可选五种讲解模式。"
              stat={
                project.ladderCount < 5
                  ? "先生成学习阶梯"
                  : !activeLesson
                    ? `第 ${learnStage} 阶内容尚未生成`
                    : `第 ${learnStage} 阶 · ${LESSON_MODE_META[activeLesson.mode].short} · 已学 ${activeLesson.completedCount}/${activeLesson.sectionCount} 节`
              }
            />
            <ModuleCard
              href={`/project/${id}/exam`}
              icon={ClipboardCheck}
              title="AI 考官"
              description="单选 / 简答可选，即时判分，结束后给缺口报告。"
              stat={
                project.examCount > 0
                  ? `${project.examCount} 场 · 均分 ${project.examAvg?.toFixed(1) ?? "—"}`
                  : "还没有考试记录"
              }
            />
            <ModuleCard
              href={`/project/${id}/feynman`}
              icon={MessageSquareQuote}
              title="费曼反馈"
              description="AI 先讲一遍，你再讲回去，直到真的讲清楚。"
              stat={
                project.feynmanPassed > 0 || project.feynmanActive > 0
                  ? `${project.feynmanPassed} 个已通过 · ${project.feynmanActive} 个进行中`
                  : "还没有费曼记录"
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={<Compass size={15} />}
              title="当前阶段"
              description={
                stageMeta
                  ? `${stageMeta.name} · ${stageMeta.tagline}`
                  : "还没有做过阶段定位"
              }
              action={
                <Link
                  href={`/project/${id}/ladder`}
                  className="rounded-lg px-2 py-1 text-[11.5px] font-medium text-accent transition-colors hover:bg-accent-soft"
                >
                  {stageMeta ? "重新定位" : "去定位"}
                </Link>
              }
            />
            <div className="px-5 pb-5 pt-4">
              <StageTrack currentStage={project.currentStage} />
              <p className="mt-4 rounded-lg bg-paper px-3 py-2.5 text-[11.5px] leading-relaxed text-muted">
                {stageMeta
                  ? `第 ${project.currentStage} 阶的核心判据：${stageMeta.tagline}。下一阶是「${STAGE_META[nextStage].name} · ${STAGE_META[nextStage].tagline}」。`
                  : "先做一次阶段定位，AI 会根据你实际做过的事判断你在哪一阶，而不是凭感觉。"}
              </p>
            </div>
          </Card>

          <SourceManager projectId={id} initialSources={sources} />

          <Card>
            <CardHeader
              title="最近动态"
              description="项目里发生过的学习记录"
            />
            <ActivityList items={activity} />
          </Card>
        </div>
      </div>
    </div>
  );
}
