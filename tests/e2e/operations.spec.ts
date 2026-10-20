import { test, expect } from "@playwright/test";
async function login(page: import("@playwright/test").Page, role = "ADMIN") {
  await page.goto("/");
  await page.getByRole("combobox").selectOption(role);
  await page.getByRole("button", { name: "Demoya giriş yap" }).click();
  await expect(
    page.getByRole("heading", { name: "Operasyon Merkezi", exact: true }),
  ).toBeVisible();
}
test("desktop FBS: create → reserve → barcode → ship → invoice → finance → reports → return", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.screenshot({
    path: "test-results/dashboard-1440.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Yeni sipariş", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Alıcı (kurgusal)").fill("E2E kurgusal müşteri");
  await dialog.getByLabel("Ürün 1", { exact: true }).selectOption("p2");
  await dialog.getByLabel("Miktar 1", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Ürün ekle", exact: true }).click();
  await dialog.getByLabel("Ürün 2", { exact: true }).selectOption("p3");
  await dialog
    .getByRole("button", { name: "Siparişi oluştur", exact: true })
    .click();
  await expect(
    dialog.getByText("E2E kurgusal müşteri", { exact: true }),
  ).toBeVisible();
  const number = await dialog.locator(".drawer-header h2").innerText();
  await dialog
    .getByRole("button", { name: "Stok kontrol et & rezerve et" })
    .click();
  await expect(dialog.getByLabel("Ürün barkodu")).toBeVisible();
  const barcodes = await dialog.locator(".order-lines code").allTextContents();
  for (const barcode of [barcodes[0], barcodes[0], barcodes[1]]) {
    await dialog.getByLabel("Ürün barkodu").fill(barcode);
    await dialog.getByRole("button", { name: "Doğrula", exact: true }).click();
    await expect(dialog.getByText("İşlem kaydediliyor…")).toHaveCount(0);
  }
  await expect(
    dialog.getByRole("button", { name: "Sevk et", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Sevk et", exact: true }).click();
  await expect(dialog.getByText("Sevk edildi", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Fatura taslağı oluştur" }).click();
  await expect(
    dialog.getByRole("link", { name: "DEMO / TASLAK PDF" }),
  ).toBeVisible();
  const href = await dialog
    .getByRole("link", { name: "DEMO / TASLAK PDF" })
    .getAttribute("href");
  const invoice = await page.context().newPage();
  await invoice.goto(href!);
  await expect(
    invoice.getByRole("heading", { name: "DEMO / TASLAK" }),
  ).toBeVisible();
  await invoice.close();
  await dialog.getByRole("button", { name: "Detayı kapat" }).click();
  await page
    .getByRole("button", { name: "Finans & Analitik", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sipariş bazında mutabakat" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Excel raporu" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("marketplace-report.xlsx");
  const response = await page.request.get(
    "/api/export?format=pdf&currency=RUB&from=2026-01-01&to=2027-01-01",
  );
  expect(response.status()).toBe(200);
  expect((await response.body()).subarray(0, 4).toString()).toBe("%PDF");
  await page.getByRole("button", { name: /^Siparişler/ }).click();
  await page.getByLabel("Sipariş ara").fill(number);
  await page.getByRole("button", { name: number, exact: true }).click();
  await dialog
    .getByLabel("İşlem gerekçesi", { exact: true })
    .fill("E2E iade kontrolü");
  await dialog.getByRole("button", { name: "İade al → Karantina" }).click();
  await expect(
    dialog.getByText("İade kontrolde", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "QC onayla → Satılabilir stok" })
    .click();
  await expect(
    dialog.getByText("İade tamamlandı", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await dialog.getByRole("button", { name: "Detayı kapat" }).click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({
    path: "test-results/orders-1920.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Operasyon Merkezi", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("server permissions, session isolation and scoped reset through browser", async ({
  page,
  browser,
}) => {
  await login(page, "WAREHOUSE");
  await expect(
    page.getByRole("button", { name: "Finans & Analitik", exact: true }),
  ).toHaveCount(0);
  const denied = await page.request.get(
    "/api/export?format=xlsx&currency=RUB&from=2026-01-01&to=2027-01-01",
  );
  expect(denied.status()).toBe(403);
  const a = await (await page.request.get("/api/workspace")).json();
  const context = await browser.newContext();
  const other = await context.newPage();
  await login(other);
  const b = await (await other.request.get("/api/workspace")).json();
  expect(a.workspace.id).not.toBe(b.workspace.id);
  await other
    .getByRole("button", { name: "Sistem Yönetimi", exact: true })
    .click();
  await other.getByLabel("Demo sıfırlama onayı").fill("SIFIRLA");
  await other.getByRole("button", { name: "Bu demo alanını sıfırla" }).click();
  await expect(other.getByText("Nesil: 2", { exact: false })).toBeVisible();
  const after = await (await page.request.get("/api/workspace")).json();
  expect(after.workspace.generation).toBe(a.workspace.generation);
  expect(after.orders.length).toBe(260);
  await context.close();
});
