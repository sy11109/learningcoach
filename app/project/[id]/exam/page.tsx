import { notFound } from "next/navigation";
import { ExamWorkspace } from "@/components/exam/ExamWorkspace";
import { getActiveExam, listExamSessions } from "@/lib/repos/exam";
import { getProject } from "@/lib/repos/projects";

export const dynamic = "force-dynamic";

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    focus?: string | string[];
    type?: string | string[];
    difficulty?: string | string[];
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const project = getProject(id);
  if (!project) notFound();

  const focus =
    typeof query.focus === "string" ? query.focus.slice(0, 200) : "";
  const initialQuestionType =
    query.type === "short" ? ("short" as const) : ("choice" as const);
  const rawDifficulty =
    typeof query.difficulty === "string" ? Number(query.difficulty) : 1;
  const initialDifficulty = Number.isFinite(rawDifficulty)
    ? Math.min(5, Math.max(1, Math.round(rawDifficulty)))
    : 1;

  return (
    <ExamWorkspace
      projectId={project.id}
      initialActive={getActiveExam(project.id)}
      initialSessions={listExamSessions(project.id)}
      initialFocus={focus}
      initialQuestionType={initialQuestionType}
      initialDifficulty={initialDifficulty}
    />
  );
}
