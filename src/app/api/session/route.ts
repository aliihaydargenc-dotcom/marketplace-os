import { NextResponse } from "next/server";
import { z } from "zod";
import { openSession, closeSession } from "@/server/auth";
import { errorResponse, sameOrigin } from "@/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { role } = z
      .object({ role: z.enum(["ADMIN", "WAREHOUSE", "ACCOUNTANT"]) })
      .parse(await request.json());
    await openSession(role);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    await closeSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
