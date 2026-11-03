import { z } from "zod";
import { readJson } from "@/lib/api";
import { getAiConfig } from "@/lib/ai/client";
import { errorResponse } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import {
  createFeynmanSession,
  getFeynmanDetail,
  getLatestFeynman,
  listFeynmanSessions,
} from "@/lib/repos/feynman";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  concept: z.string().trim().min(1, "请填写要讲的概念").max(80),
});

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    getProjectOrThrow(id);
    return Response.json({
      latest: getLatestFeynman(id),
      sessions: listFeynmanSessions(id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const project = getProjectOrThrow(id);
    const config = getAiConfig();
    const { concept } = await readJson(request, CreateSchema);

    const session = createFeynmanSession(project.id, concept, config.model);
    return Response.json(getFeynmanDetail(session.id), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
