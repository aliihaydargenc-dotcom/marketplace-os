import { NextResponse } from "next/server";
import { actor } from "@/server/auth";
import { errorResponse } from "@/server/http";
import { latestExchangeQuote } from "@/server/exchange-rates";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await actor();
    try {
      return NextResponse.json(await latestExchangeQuote(), {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch {
      return NextResponse.json(
        { error: "TCMB kuru alınamadı. Döviz karşılıkları gösterilmiyor." },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  } catch (error) {
    return errorResponse(error);
  }
}
