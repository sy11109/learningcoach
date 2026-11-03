import { chatJson } from "@/lib/ai/client";
import { buildExamReportMessages } from "@/lib/ai/prompts";
import { ExamReportSchema } from "@/lib/ai/schemas";
import { AppError, errorResponse } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { getLadder } from "@/lib/repos/ladder";
import {
  finishExamSession,
  getExamDetail,
  getExamSessionOrThrow,
} from "@/lib/repos/exam";
import type { ExamReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await ctx.params;
    const session = getExamSessionOrThrow(sessionId);

    if (session.status === "finished" && session.report) {
      return Response.json(getExamDetail(sessionId));
    }

    const detail = getExamDetail(sessionId);
    const answered = detail.turns.filter((turn) => turn.answer !== null);
    if (answered.length === 0) {
      throw new AppError("CONFLICT", "还没有任何答题记录，无法生成报告。");
    }

    const project = getProjectOrThrow(session.projectId);
    const ladder = getLadder(project.id);

    const output = await chatJson({
      messages: buildExamReportMessages({
        project,
        ladder,
        session,
        turns: detail.turns,
      }),
      schema: ExamReportSchema,
      maxTokens: 2200,
      kind: "exam-report",
      projectId: project.id,
      repairHint:
        '{"overallScore":6.5,"strengths":["……"],"gaps":[{"topic":"……","why":"……","severity":"high"}],"reviewPlan":[{"title":"……","action":"……","minutes":30}],"nextFocus":"……"}',
    });

    const average =
      Math.round(
        (answered.reduce((sum, turn) => sum + (turn.score ?? 0), 0) /
          answered.length) *
          10,
      ) / 10;

    const report: ExamReport = {
      ...output,
      overallScore: average,
      strengths: output.strengths.slice(0, 8),
      gaps: output.gaps.slice(0, 10),
      reviewPlan: output.reviewPlan.slice(0, 8),
    };

    const finished = finishExamSession(sessionId, report, average);
    return Response.json({
      session: finished,
      turns: detail.turns,
      report,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
