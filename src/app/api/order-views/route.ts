import { NextResponse } from "next/server";
import { actor } from "@/server/auth";
import { errorResponse, sameOrigin } from "@/server/http";
import { readOrderViews, mutateOrderViews } from "@/server/order-views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    return NextResponse.json(await readOrderViews(await actor()), { headers });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const owner = await actor();
    const input = await request.json();
    return NextResponse.json(await mutateOrderViews(owner, input), { headers });
  } catch (e) {
    return errorResponse(e);
  }
}
