import { notFound } from "next/navigation";
import { LadderBoard } from "@/components/ladder/LadderBoard";
import { getLatestAssessment } from "@/lib/repos/assessment";
import { getLadder } from "@/lib/repos/ladder";
import { getProject } from "@/lib/repos/projects";

export const dynamic = "force-dynamic";

export default async function LadderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <LadderBoard
      projectId={project.id}
      topic={project.topic}
      initialLevels={getLadder(project.id)}
      initialAssessment={getLatestAssessment(project.id)}
      initialStage={project.currentStage}
    />
  );
}
