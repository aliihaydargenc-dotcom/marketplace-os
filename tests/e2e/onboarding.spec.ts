import { expect, test } from "@playwright/test";

test("first-time demo guidance is brief, dismissible and replayable", async ({
  page,
}) => {
  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "Kısa kullanım rehberi" });
  await expect(guide.getByRole("heading", { name: "Rol seç" })).toBeVisible();
  await expect(page.locator(".onboarding-highlight")).toBeVisible();
  await expect(page.locator(".onboarding-pointer")).toBeVisible();

  await guide.getByRole("button", { name: "İleri" }).click();
  await expect(
    guide.getByRole("heading", { name: "Başlangıç ekranı" }),
  ).toBeVisible();
  await guide.getByRole("button", { name: "Geri" }).click();
  await expect(guide.getByRole("heading", { name: "Rol seç" })).toBeVisible();
  await guide.getByRole("button", { name: "Geç" }).click();

  await expect(guide).toHaveCount(0);
  await page.reload();
  await expect(guide).toHaveCount(0);
  await page.getByRole("button", { name: "Rehber" }).click();
  await expect(guide.getByRole("heading", { name: "Rol seç" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(guide).toHaveCount(0);
});

test("workspace tour points to real sections and stays out of the work area", async ({
  page,
}) => {
  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "Kısa kullanım rehberi" });
  await expect(guide.getByRole("heading", { name: "Rol seç" })).toBeVisible();
  await guide.getByRole("button", { name: "Geç" }).click();

  await page.locator("#demo-enter").click();
  await expect(
    page.getByRole("heading", { name: "Operasyon Merkezi", exact: true }),
  ).toBeVisible();
  await expect(guide.getByRole("heading", { name: "Bölümler" })).toBeVisible();
  await guide.getByRole("button", { name: "İleri" }).click();
  await expect(
    guide.getByRole("heading", { name: "Çalışma alanı" }),
  ).toBeVisible();
  await guide.getByRole("button", { name: "İleri" }).click();
  await expect(
    guide.getByRole("heading", { name: "Oturum ve yardım" }),
  ).toBeVisible();
  await guide.getByRole("button", { name: "Bitir" }).click();
  await expect(guide).toHaveCount(0);

  await page.reload();
  await expect(guide).toHaveCount(0);
  await page
    .getByRole("button", { name: "Kısa kullanım rehberini aç" })
    .click();
  await expect(guide.getByRole("heading", { name: "Bölümler" })).toBeVisible();
  await guide.getByRole("button", { name: "Geç" }).click();
  await expect(guide).toHaveCount(0);
});

test("guidance remains controllable in a narrow mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "Kısa kullanım rehberi" });
  await expect(guide).toBeVisible();
  for (let index = 0; index < 3; index += 1) {
    const bounds = await guide.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845);
    await guide
      .getByRole("button", { name: index === 2 ? "Bitir" : "İleri" })
      .click();
  }
  await expect(guide).toHaveCount(0);
});

test("Ozon real public offers keep provenance separate from seeded orders", async ({
  page,
}) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("marketplace-os:tour:entry-v1", "done");
      localStorage.setItem("marketplace-os:tour:workspace-v1", "done");
    } catch {
      // Browsers without local storage may display the dismissible tour.
    }
  });
  await page.goto("/");
  await page.locator("#demo-enter").click();
  await expect(
    page.getByRole("heading", { name: "Operasyon Merkezi", exact: true }),
  ).toBeVisible();
  const overview = page.getByRole("region", {
    name: "Gerçek Ozon ürün ve fiyat gözlemleri",
  });
  await expect(overview.getByText("Ozon Pazar Verileri")).toBeVisible();
  await overview.getByRole("button", { name: "Tüm ürünler" }).click();
  await expect(
    page.getByRole("heading", { name: "Stok & Depo", exact: true }),
  ).toBeVisible();
  const full = page.getByRole("region", {
    name: "Gerçek Ozon ürün ve fiyat gözlemleri",
  });
  await full.getByRole("searchbox", { name: "Ozon ürünlerinde ara" }).fill("3867869659");
  await expect(full.getByText("Modalin HARMONIA pamuklu havlu seti")).toBeVisible();
  await expect(full.getByRole("link", { name: "Ozon'da aç" })).toHaveAttribute(
    "href",
    /ozon\.ru\/product\/.*3867869659/,
  );
  await full.getByRole("searchbox", { name: "Ozon ürünlerinde ara" }).fill("1416873033");
  await expect(full.getByText("Doğrulanamadı")).toBeVisible();
});
