import { testConnection } from "@/lib/ai/client";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    return Response.json(await testConnection());
  } catch (error) {
    return errorResponse(error);
  }
}
