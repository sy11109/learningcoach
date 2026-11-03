import { errorResponse, AppError } from "@/lib/errors";
import { extractSourceText } from "@/lib/files";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { addSource, listSources } from "@/lib/repos/sources";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    getProjectOrThrow(id);
    return Response.json({ sources: listSources(id) });
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
    getProjectOrThrow(id);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AppError("VALIDATION", "上传请求格式不正确。");
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION", "请选择一个要上传的文件。");
    }

    const extracted = await extractSourceText(file);
    const source = addSource({
      projectId: id,
      name: extracted.name,
      mime: extracted.mime,
      text: extracted.text,
    });
    return Response.json({ source }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
