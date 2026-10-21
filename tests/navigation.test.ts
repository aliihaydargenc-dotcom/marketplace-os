import { describe, expect, it } from "vitest";
import {
  canOpenSection,
  defaultSection,
  resolveSection,
} from "../src/domain/navigation";

describe("workspace entry URLs", () => {
  it("uses role-specific homes and rejects forbidden sections", () => {
    expect(defaultSection("ADMIN")).toBe("dashboard");
    expect(resolveSection("finance", "WAREHOUSE")).toBe("packing");
    expect(resolveSection("settings", "ACCOUNTANT")).toBe("invoices");
    expect(resolveSection("packing", "ACCOUNTANT")).toBe("invoices");
    expect(canOpenSection("WAREHOUSE", "inventory")).toBe(true);
    expect(resolveSection("returns", "WAREHOUSE")).toBe("returns");
    expect(resolveSection("returns", "ACCOUNTANT")).toBe("invoices");
  });
  it("accepts only allowlisted local section IDs, including on return links", () => {
    for (const input of [
      "https://example.com",
      "//example.com",
      "constructor",
      "toString",
      ["orders"],
      null,
      undefined,
    ]) {
      expect(resolveSection(input, "ADMIN")).toBe("dashboard");
    }
    expect(resolveSection("orders", "ADMIN")).toBe("orders");
    expect(resolveSection("packing", "WAREHOUSE")).toBe("packing");
    expect(resolveSection("finance", "ACCOUNTANT")).toBe("finance");
  });
});
