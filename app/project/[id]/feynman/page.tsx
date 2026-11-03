import { notFound } from "next/navigation";
import { FeynmanWorkspace } from "@/components/feynman/FeynmanWorkspace";
import { getLatestFeynman, listFeynmanSessions } from "@/lib/repos/feynman";
import { getProject } from "@/lib/repos/projects";
import { getSelfChecks } from "@/lib/repos/selfChecks";

export const dynamic = "force-dynamic";

export default async function FeynmanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ concept?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const project = getProject(id);
  if (!project) notFound();

  const latest = getLatestFeynman(project.id);
  const concept =
    typeof query.concept === "string" ? query.concept.slice(0, 80) : "";

  return (
    <FeynmanWorkspace
      projectId={project.id}
      initialSessions={listFeynmanSessions(project.id)}
      initialActive={
        latest && latest.session.status === "active" ? latest.session : null
      }
      initialConcept={concept}
      initialSelfChecks={getSelfChecks(project.id)}
    />
  );
}
