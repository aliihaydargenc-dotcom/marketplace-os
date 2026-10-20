import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "@/domain/permissions";
export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: "Girdi doğrulanamadı",
        details: error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  if (error instanceof DomainError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error(
    "Marketplace request failed",
    error instanceof Error ? error.message : "unknown",
  );
  return NextResponse.json(
    { error: "İşlem tamamlanamadı. Yenileyip tekrar deneyin." },
    { status: 500 },
  );
}
export function sameOrigin(request: Request) {
  const raw = request.headers.get("origin"),
    host = request.headers.get("host");
  if (!raw || !host) throw new DomainError("Geçersiz istek kaynağı", 403);
  let origin: URL;
  try {
    origin = new URL(raw);
  } catch {
    throw new DomainError("Geçersiz istek kaynağı", 403);
  }
  // Next may reconstruct request.url with its internal hostname behind the server.
  // Compare to the actual Host header; never accept an arbitrary forwarded host.
  if (origin.host !== host || !["http:", "https:"].includes(origin.protocol))
    throw new DomainError("Geçersiz istek kaynağı", 403);
}
