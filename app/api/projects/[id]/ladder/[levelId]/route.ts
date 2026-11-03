import { z } from "zod";
import { readJson } from "@/lib/api";
import { errorResponse } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { updateLevel } from "@/lib/repos/ladder";

export const dynamic = "force-dynamic";

const UpdateLevelSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  summary: z.string().max(400).optional(),
  mustMaster: z.array(z.string().min(1).max(400)).max(10).optional(),
  commonMistakes: z.array(z.string().min(1).max(400)).max(10).optional(),
  gateCriteria: z.string().max(1000).optional(),
  practice: z.string().max(1000).optional(),
  estimatedSessions: z.number().int().min(0).max(40).nullable().optional(),
  estimatedHours: z.number().min(0).max(500).nullable().optional(),
  estimatedWeeks: z.number().min(0).max(52).nullable().optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; levelId: string }> },
) {
  try {
    const { id, levelId } = await ctx.params;
    getProjectOrThrow(id);
    const patch = await readJson(request, UpdateLevelSchema);
    const level = updateLevel(id, levelId, patch);
    return Response.json({ level });
  } catch (error) {
    return errorResponse(error);
  }
}
