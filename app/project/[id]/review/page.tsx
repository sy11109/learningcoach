import { notFound } from "next/navigation";
import { ReviewBoard } from "@/components/review/ReviewBoard";
import { getProject } from "@/lib/repos/projects";
import { getReviewData } from "@/lib/repos/review";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          错题回顾
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
          把 AI 考官里的错题按知识点汇总：反复错的地方优先补，偶发失误确认一下就好。补完可以直接针对知识点重考。
        </p>
      </div>
      <ReviewBoard projectId={project.id} data={getReviewData(project.id)} />
    </div>
  );
}
