import { notFound } from "next/navigation";
import { LearnWorkspace } from "@/components/learn/LearnWorkspace";
import { getLadder } from "@/lib/repos/ladder";
import { getLesson, listLessonSummaries } from "@/lib/repos/lessons";
import { getProject } from "@/lib/repos/projects";
import {
  LESSON_MODES,
  type LessonMode,
  type Stage,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    stage?: string | string[];
    mode?: string | string[];
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const project = getProject(id);
  if (!project) notFound();

  const rawStage =
    typeof query.stage === "string" ? Number(query.stage) : NaN;
  const initialStage = (
    Number.isInteger(rawStage) && rawStage >= 1 && rawStage <= 5
      ? rawStage
      : (project.currentStage ?? 1)
  ) as Stage;

  const initialMode: LessonMode =
    typeof query.mode === "string" &&
    (LESSON_MODES as readonly string[]).includes(query.mode)
      ? (query.mode as LessonMode)
      : "standard";

  return (
    <LearnWorkspace
      projectId={project.id}
      ladder={getLadder(project.id)}
      lessonSummaries={listLessonSummaries(project.id)}
      initialStage={initialStage}
      initialMode={initialMode}
      initialLesson={getLesson(project.id, initialStage, initialMode)}
      currentStage={project.currentStage}
    />
  );
}
