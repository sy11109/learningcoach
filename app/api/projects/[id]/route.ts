import { z } from "zod";
import { readJson } from "@/lib/api";
import { errorResponse } from "@/lib/errors";
import {
  deleteProject,
  getProjectOrThrow,
  updateProject,
} from "@/lib/repos/projects";

export const dynamic = "force-dynamic";

const UpdateProjectSchema = z.object({
  topic: z.string().trim().min(1).max(120).optional(),
  goal: z.string().max(500).optional(),
  background: z.string().max(1200).optional(),
  weeklyHours: z.number().int().min(1).max(60).optional(),
  pace: z.enum(["light", "standard", "deep"]).optional(),
  currentStage: z.number().int().min(1).max(5).nullable().optional(),
});

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    return Response.json({ project: getProjectOrThrow(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const patch = await readJson(request, UpdateProjectSchema);
    const project = updateProject(
      id,
      patch as Parameters<typeof updateProject>[1],
    );
    return Response.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    deleteProject(id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
