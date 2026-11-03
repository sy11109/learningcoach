import { z } from "zod";
import { readJson } from "@/lib/api";
import { errorResponse } from "@/lib/errors";
import { createProject, listProjects } from "@/lib/repos/projects";

export const dynamic = "force-dynamic";

const CreateProjectSchema = z.object({
  topic: z.string().trim().min(1, "请填写学习主题").max(120),
  goal: z.string().max(500).optional(),
  background: z.string().max(1200).optional(),
  weeklyHours: z.number().int().min(1).max(60).optional(),
  pace: z.enum(["light", "standard", "deep"]).optional(),
});

export async function GET() {
  try {
    return Response.json({ projects: listProjects() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await readJson(request, CreateProjectSchema);
    const project = createProject(input);
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
