import { expect, test } from "@playwright/test";

test("action center prioritizes real tasks and preserves cross-section navigation", async ({
  page,
}) => {
  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "Kısa kullanım rehberi" });
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "Geç" }).click();
  await page.locator("#demo-enter").click();
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "Geç" }).click();
  const center = page.getByRole("region", { name: "Günlük operasyon işleri" });
  await expect(
    center.getByRole("heading", { name: "Önce ne yapılmalı?" }),
  ).toBeVisible();
  await expect(
    center.getByRole("button", { name: /Tüm işler/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await center.getByRole("button", { name: /Hazırlama & sevk/ }).click();
  await expect(
    center.getByRole("button", { name: /Hazırlama & sevk/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(center.locator(".action-list-row").first()).toBeVisible();
  await center.locator(".action-list-row").first().click();
  await expect(
    center.getByRole("button", {
      name: /Hazırlamaya geç|Hazırlamayı aç|Sevkiyata geç/,
    }),
  ).toBeVisible();
  await center
    .getByRole("button", {
      name: /Hazırlamaya geç|Hazırlamayı aç|Sevkiyata geç/,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hazırlama Masası" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Çalışma alanları" })
    .getByRole("button", { name: "Siparişler" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Siparişler", exact: true }),
  ).toBeVisible();
});

test("action center uses a filterable list with accessible focus on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "Kısa kullanım rehberi" });
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "Geç" }).click();
  await page.locator("#demo-enter").click();
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "Geç" }).click();
  const center = page.getByRole("region", { name: "Günlük operasyon işleri" });
  await expect(
    center.getByRole("searchbox", { name: "İşlerde ara" }),
  ).toBeVisible();
  await center
    .getByRole("searchbox", { name: "İşlerde ara" })
    .fill("NO_SUCH_ORDER_999");
  await expect(center.getByText("Bu görünümde bekleyen iş yok")).toBeVisible();
  await center.getByRole("searchbox", { name: "İşlerde ara" }).clear();
  await expect(center.locator(".action-list-row").first()).toBeVisible();
  const width = await center.evaluate(
    (el) => el.scrollWidth <= document.documentElement.clientWidth + 2,
  );
  expect(width).toBe(true);
});
