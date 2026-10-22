import { expect, test } from "@playwright/test";
import type { WorkspaceSnapshot } from "../../src/domain/types";

test("preparation screen limits DOM rows but searches the entire 1,205 order snapshot", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("marketplace-os:tour:entry-v1", "done");
    localStorage.setItem("marketplace-os:tour:workspace-v1", "done");
  });
  await page.goto("/");
  await page.locator("#demo-enter").click();
  await expect(
    page.getByRole("heading", { name: "Operasyon Merkezi", exact: true }),
  ).toBeVisible();
  await page.route("**/api/workspace", async (route) => {
    const reply = await route.fetch();
    if (!reply.ok()) return route.fulfill({ response: reply });
    const data = (await reply.json()) as WorkspaceSnapshot;
    const example = data.orders.find((o) => o.fulfillment === "FBS");
    if (!example) throw new Error("FBS fixture unavailable");
    const synthetic = Array.from({ length: 1205 }, (_, index) => ({
      ...example,
      id: "scale-" + String(index).padStart(4, "0"),
      number: "SCALE-" + String(index).padStart(4, "0"),
      customer: "Scale QA " + String(index).padStart(4, "0"),
      status: "RESERVED" as const,
      created_at: new Date(Date.UTC(2026, 9, 1, 0, 0, index)).toISOString(),
      lines: example.lines.map((line) => ({
        ...line,
        order_id: "scale-" + String(index).padStart(4, "0"),
        packed: 0,
      })),
      shipped_at: null,
    }));
    return route.fulfill({
      response: reply,
      json: { ...data, orders: [...data.orders, ...synthetic] },
    });
  });
  await page.goto("/workspace?section=packing");
  const search = page.getByLabel("Hazırlama kuyruğunda ara");
  await expect(search).toBeVisible();
  await search.fill("Scale QA");
  const list = page.locator(".packing-queue-list");
  await expect(list.locator(":scope > button")).toHaveCount(81);
  await expect(
    list.getByRole("button", { name: "Sonraki 80 siparişi göster" }),
  ).toBeVisible();
  await list
    .getByRole("button", { name: "Sonraki 80 siparişi göster" })
    .click();
  await expect(list.locator(":scope > button")).toHaveCount(161);
  await search.fill("Scale QA 1204");
  await expect(list.getByText("Scale QA 1204", { exact: true })).toBeVisible();
  await expect(list.locator(":scope > button")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
