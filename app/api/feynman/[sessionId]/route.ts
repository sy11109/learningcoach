import { errorResponse } from "@/lib/errors";
import { getFeynmanDetail } from "@/lib/repos/feynman";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await ctx.params;
    return Response.json(getFeynmanDetail(sessionId));
  } catch (error) {
    return errorResponse(error);
  }
}
