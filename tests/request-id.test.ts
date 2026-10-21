import { afterEach, describe, expect, it, vi } from "vitest";
import { requestId } from "../src/domain/request-id";
afterEach(() => vi.unstubAllGlobals());
describe("browser mutation request IDs", () => {
  it("uses native randomUUID when available", () => {
    const native = vi.fn(() => "14119f4b-d7b0-40af-9b90-f6a2daff20a4");
    vi.stubGlobal("crypto", { randomUUID: native });
    expect(requestId()).toBe("14119f4b-d7b0-40af-9b90-f6a2daff20a4");
    expect(native).toHaveBeenCalledOnce();
  });
  it("creates an RFC 4122 version 4 key using getRandomValues in HTTP previews", () => {
    const random = vi.fn((bytes: Uint8Array) => {
      bytes.fill(255);
      return bytes;
    });
    vi.stubGlobal("crypto", { getRandomValues: random });
    expect(requestId()).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(random).toHaveBeenCalledOnce();
  });
});
