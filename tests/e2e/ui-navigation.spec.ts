import { expect, test } from "@playwright/test";

async function enterDemo(page: import("@playwright/test").Page, role = "ADMIN") {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("marketplace-os:tour:entry-v1", "done");
      localStorage.setItem("marketplace-os:tour:workspace-v1", "done");
    } catch {
      // Private browsing can disable the onboarding persistence mechanism.
    }
  });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Demo rolü" }).selectOption(role);
  await page.locator("#demo-enter").click();
  await expect(page.locator(".ledger-header")).toBeVisible();
}

test("quick switcher, browser history, and empty search recovery", async ({
  page,
}) => {
  await enterDemo(page);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Hızlı bölüm geçişi" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox", { name: "Bölüm ara" }).fill("Finans");
  await expect(
    dialog.getByRole("option", { name: /Finans & Analitik/ }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/section=finance/);
  await expect(
    page.getByRole("heading", { name: "Finans & Analitik" }),
  ).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/section=dashboard/);
  await expect(
    page.getByRole("heading", { name: "Operasyon Merkezi" }),
  ).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/section=finance/);

  await page
    .getByRole("navigation", { name: "Çalışma alanları" })
    .getByRole("button", { name: "Siparişler" })
    .click();
  const search = page.getByRole("searchbox", { name: "Sipariş ara" });
  await expect(search).toBeVisible();
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
  await search.fill("NO_SUCH_ORDER_XYZ_123");
  await expect(page.getByText("Eşleşen sipariş bulunamadı")).toBeVisible();
  await page.getByRole("button", { name: "Filtreleri temizle" }).first().click();
  await expect(search).toHaveValue("");
});

test("section switcher obeys warehouse role and fits mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDemo(page, "WAREHOUSE");
  await page.getByRole("button", { name: "Hızlı bölüm geçişi" }).click();
  const dialog = page.getByRole("dialog", { name: "Hızlı bölüm geçişi" });
  await dialog.getByRole("combobox", { name: "Bölüm ara" }).fill("finans");
  await expect(
    dialog.getByText(
      "Bu aramayla eşleşen erişilebilir bir bölüm bulunamadı.",
    ),
  ).toBeVisible();
  await dialog.getByRole("combobox", { name: "Bölüm ara" }).fill("Stok");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/section=inventory/);
  await expect(page.getByRole("heading", { name: "Stok & Depo" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
