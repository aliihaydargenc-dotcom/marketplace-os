import { describe, expect, it } from "vitest";
import { entryGuide, placeTour, workspaceGuide } from "../src/domain/onboarding";

describe("contextual demo tour", () => {
  it("keeps a popover within desktop bounds", () => {
    expect(placeTour({ left: 1350, right: 1410, top: 90, bottom: 130 }, 1440, 900))
      .toEqual({ left: 1088, top: 144, placement: "below" });
  });
  it("moves above bottom-edge targets", () => {
    expect(placeTour({ left: 20, right: 240, top: 670, bottom: 725 }, 390, 844))
      .toEqual({ left: 20, top: 462, placement: "above" });
  });
  it("clamps an unusually short viewport", () => {
    const position = placeTour({ left: 260, right: 365, top: 200, bottom: 260 }, 375, 320);
    expect(position.left).toBe(23);
    expect(position.top).toBe(16);
    expect(position.placement).toBe("above");
  });
  it("uses the roomier side if neither side fits full height", () => {
    const position = placeTour(
      { left: 20, right: 100, top: 50, bottom: 95 },
      390,
      270,
    );
    expect(position.placement).toBe("below");
    expect(position.top).toBe(109);
  });
  it("points to controls and keeps steps concise", () => {
    expect(entryGuide.map((step) => step.target)).toEqual(["#demo-role", "#demo-section", "#demo-enter"]);
    expect(workspaceGuide).toHaveLength(3);
    expect(entryGuide.every((step) => step.description.length < 90)).toBe(true);
  });
});
