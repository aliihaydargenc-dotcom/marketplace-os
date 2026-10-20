import { NextResponse } from "next/server";
import { actor } from "@/server/auth";
import { execute } from "@/server/execute";
import { requestSchema } from "@/domain/orders/commands";
import { errorResponse, sameOrigin } from "@/server/http";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const a = await actor(),
      input = requestSchema.parse(await request.json());
    const result = await execute(a, input.command, input.key, input.generation);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
