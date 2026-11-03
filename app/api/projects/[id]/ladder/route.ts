import { getAiConfig, chatJson } from "@/lib/ai/client";
import { buildLadderMessages } from "@/lib/ai/prompts";
import { LadderSchema } from "@/lib/ai/schemas";
import { errorResponse } from "@/lib/errors";
import { AppError } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { getLadder, replaceLadder } from "@/lib/repos/ladder";
import { getSourceTexts } from "@/lib/repos/sources";
import type { Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    getProjectOrThrow(id);
    return Response.json({ levels: getLadder(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const project = getProjectOrThrow(id);
    getAiConfig();

    const output = await chatJson({
      messages: buildLadderMessages(project, getSourceTexts(project.id)),
      schema: LadderSchema,
      maxTokens: 6000,
      kind: "ladder-generate",
      projectId: project.id,
      repairHint:
        '{"levels":[{"stage":1,"title":"阶段1 入门 — 能跑起来","summary":"……","mustMaster":["……"],"commonMistakes":["……"],"gateCriteria":"……","practice":"……","estimatedSessions":2,"estimatedHours":6,"estimatedWeeks":1.5}]}',
    });

    const stages = new Set(output.levels.map((level) => level.stage));
    if (stages.size !== 5) {
      throw new AppError(
        "AI_BAD_OUTPUT",
        "AI 生成的阶段不完整，请重新生成。",
      );
    }

    const levels = replaceLadder(
      project.id,
      [...output.levels]
        .sort((a, b) => a.stage - b.stage)
        .map((level) => ({
          ...level,
          stage: level.stage as Stage,
        })),
    );

    return Response.json({ levels });
  } catch (error) {
    return errorResponse(error);
  }
}
