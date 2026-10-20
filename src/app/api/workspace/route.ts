import { NextResponse } from "next/server";
import { actor } from "@/server/auth";
import { database } from "@/server/db";
import { snapshot } from "@/server/snapshot";
import { errorResponse } from "@/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const a = await actor();
    const data = await database().transaction((tx) => snapshot(a, tx), {
      isolationLevel: "repeatable read",
      accessMode: "read only",
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
