import { notFound } from "next/navigation";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { ProjectNav } from "@/components/project/ProjectNav";
import { getProject } from "@/lib/repos/projects";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />
      <div className="grid gap-6 lg:grid-cols-[196px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <ProjectNav projectId={project.id} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
