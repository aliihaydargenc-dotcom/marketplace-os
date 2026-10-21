import { NextResponse } from "next/server";
import { z } from "zod";
import { actor } from "@/server/auth";
import { errorResponse, sameOrigin } from "@/server/http";
import { packingLease } from "@/server/services/packing-leases";

export const runtime = "nodejs";
const schema = z.object({
  orderId: z.string().min(1).max(100),
  terminalId: z.uuid(),
  generation: z.number().int().positive(),
  action: z.enum(["STATUS", "CLAIM", "RENEW", "RELEASE", "TAKE_OVER"]),
}).strict();

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const a = await actor();
    const input = schema.parse(await request.json());
    const result = await packingLease(a, input.orderId, input.terminalId, input.action, input.generation);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
