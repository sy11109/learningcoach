import { errorResponse } from "@/lib/errors";
import { deleteSource } from "@/lib/repos/sources";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; sourceId: string }> },
) {
  try {
    const { id, sourceId } = await ctx.params;
    deleteSource(id, sourceId);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
