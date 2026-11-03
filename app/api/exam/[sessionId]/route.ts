import { errorResponse } from "@/lib/errors";
import { getExamDetail } from "@/lib/repos/exam";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await ctx.params;
    return Response.json(getExamDetail(sessionId));
  } catch (error) {
    return errorResponse(error);
  }
}
