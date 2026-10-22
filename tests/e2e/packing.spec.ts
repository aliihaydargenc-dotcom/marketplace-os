import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { Command } from "../../src/domain/orders/commands";
import type { WorkspaceSnapshot } from "../../src/domain/types";

const station = (page: Page) =>
  page.getByRole("region", { name: "Aktif sipariş hazırlama" });
const current = async (page: Page): Promise<WorkspaceSnapshot> => {
  const reply = await page.request.get("/api/workspace");
  expect(reply.status()).toBe(200);
  return reply.json();
};
async function send(page: Page, command: Command) {
  const data = await current(page);
  const response = await page.request.post("/api/command", {
    headers: { Origin: new URL(page.url()).origin },
    data: { command, key: randomUUID(), generation: data.workspace.generation },
  });
  expect(response.status(), await response.text()).toBe(200);
  return response.json();
}
async function fixture(page: Page, quantity = 3) {
  await page.addInitScript(() => {
    localStorage.setItem("marketplace-os:tour:entry-v1", "done");
    localStorage.setItem("marketplace-os:tour:workspace-v1", "done");
  });
  await page.goto("/");
  await page.locator("#demo-enter").click();
  await expect(
    page.getByRole("heading", { name: "Operasyon Merkezi", exact: true }),
  ).toBeVisible();
  const customer = `Packing QA ${randomUUID().slice(0, 8)}`;
  const result = await send(page, {
    action: "CREATE_ORDER",
    customer,
    currency: "RUB",
    fxDate: "2026-10-21",
    fxRate: 485000,
    commissionBps: 1500,
    logistics: 25000,
    lines: [{ productId: "p2", quantity }],
  });
  const data = await current(page),
    product = data.products.find((p) => p.id === "p2")!;
  await open(page, customer);
  return { id: result.reference as string, customer, product };
}
async function open(page: Page, customer: string) {
  await page.goto("/workspace?section=packing");
  await page.getByLabel("Hazırlama kuyruğunda ara").fill(customer);
  await expect(
    station(page).getByText(customer, { exact: true }),
  ).toBeVisible();
  await expect(
    station(page)
      .getByText("Henüz üstlenilmedi", { exact: true })
      .or(
        station(page).getByText("Başka terminalde hazırlanıyor", {
          exact: true,
        }),
      ),
  ).toBeVisible();
}

test("packing buffers rapid barcode input, ships once and fits desktop and narrow viewports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const f = await fixture(page),
    active = station(page);
  await active
    .getByRole("button", { name: "Siparişi üstlen", exact: true })
    .click();
  await expect(
    active.getByText("Bu sipariş bu terminalde", { exact: true }),
  ).toBeVisible();
  await active
    .getByRole("button", { name: "Stok rezerve et ve başla" })
    .click();
  const barcode = active.getByLabel("Hazırlama barkodu");
  await expect(barcode).toBeVisible();
  await barcode.fill("WRONG-CODE");
  await barcode.press("Enter");
  await expect(active.getByRole("alert")).toContainText(
    "Barkod bu siparişe ait değil",
  );

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let scans = 0;
  await page.route("**/api/command", async (route) => {
    if (route.request().postDataJSON()?.command?.action === "SCAN") {
      scans++;
      if (scans === 1) await gate;
    }
    await route.continue();
  });
  try {
    for (let n = 0; n < 3; n++) {
      await barcode.fill(f.product.barcode);
      await barcode.press("Enter");
    }
    await expect(
      active.getByText("Barkod işleniyor · 2 kod sırada", { exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(
    active.getByText("3 / 3 adet doğrulandı", { exact: true }),
  ).toBeVisible();
  expect(scans).toBe(3);
  await active
    .getByRole("button", { name: "Sevk et ve sıradakine geç" })
    .click();
  await expect(
    page.getByText(/sevk edildi\. Stok ve bağlı kayıtlar güncellendi\./),
  ).toBeVisible();
  const after = await current(page),
    order = after.orders.find((o) => o.id === f.id)!;
  expect(order.status).toBe("SHIPPED");
  expect(after.products.find((p) => p.id === "p2")!.physical).toBe(
    f.product.physical - 3,
  );
  expect(
    after.ledger.filter((l) => l.reference === f.id && l.kind === "SHIPMENT"),
  ).toHaveLength(1);

  await page.getByLabel("Hazırlama kuyruğunda ara").fill("");
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(
      page.getByRole("region", { name: "FBS hazırlama çalışma alanı" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/packing-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("two packing tabs reject conflicting claims, show takeover and release ownership", async ({
  page,
  context,
}) => {
  const f = await fixture(page, 1),
    first = station(page);
  const other = await context.newPage();
  await open(other, f.customer);
  const second = station(other);
  await first
    .getByRole("button", { name: "Siparişi üstlen", exact: true })
    .click();
  await expect(
    first.getByText("Bu sipariş bu terminalde", { exact: true }),
  ).toBeVisible();
  await second
    .getByRole("button", { name: "Durumu yenile", exact: true })
    .click();
  await expect(
    second.getByText("Başka terminalde hazırlanıyor", { exact: true }),
  ).toBeVisible();
  await other.screenshot({
    path: "test-results/packing-other-terminal.png",
    fullPage: true,
  });
  await second
    .getByRole("button", { name: "Siparişi üstlen", exact: true })
    .click();
  await expect(second.getByRole("alert")).toContainText("başka bir terminal");
  await second
    .getByRole("button", { name: "Yönetici olarak devral", exact: true })
    .click();
  await expect(
    second.getByText("Bu sipariş bu terminalde", { exact: true }),
  ).toBeVisible();
  // The first tab still looks like the owner; the server must reject its write.
  await first.getByRole("button", { name: "Stok rezerve et ve başla" }).click();
  await expect(first.getByRole("alert")).toContainText(
    "başka bir hazırlama terminalinde",
  );
  expect((await current(page)).orders.find((o) => o.id === f.id)!.status).toBe(
    "NEW",
  );
  await second.getByRole("button", { name: "Bırak", exact: true }).click();
  await expect(
    second.getByText("Henüz üstlenilmedi", { exact: true }),
  ).toBeVisible();
  await first
    .getByRole("button", { name: "Durumu yenile", exact: true })
    .click();
  await first
    .getByRole("button", { name: "Siparişi üstlen", exact: true })
    .click();
  await expect(
    first.getByText("Bu sipariş bu terminalde", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Çalışma alanları" })
    .getByRole("button", { name: "Siparişler", exact: true })
    .click();
  await second
    .getByRole("button", { name: "Durumu yenile", exact: true })
    .click();
  await expect(
    second.getByText("Henüz üstlenilmedi", { exact: true }),
  ).toBeVisible();
  await other.close();
});

test("warehouse order 360 hides finance and document filters in the browser", async ({
  page,
}) => {
  const f = await fixture(page);
  const origin = new URL(page.url()).origin;
  expect(
    (
      await page.request.post("/api/session", {
        headers: { Origin: origin },
        data: { role: "WAREHOUSE" },
      })
    ).status(),
  ).toBe(200);
  await open(page, f.customer);
  await station(page)
    .getByRole("button", { name: "Geçmiş ve detay ↗", exact: true })
    .click();
  const dialog = page.getByRole("dialog"),
    filters = dialog.getByRole("group", { name: "Kayıt türleri" });
  await expect(
    dialog.getByRole("region", { name: "Sipariş 360 derece süreç görünümü" }),
  ).toBeVisible();
  await expect(
    filters.getByRole("button", { name: "Finans", exact: true }),
  ).toHaveCount(0);
  await expect(
    filters.getByRole("button", { name: "Belge", exact: true }),
  ).toHaveCount(0);
  await expect(dialog.locator("#order360-finance")).toHaveCount(0);
});

test("packing lease endpoint enforces authentication, origin, role and generation", async ({
  page,
  browser,
  baseURL,
}) => {
  const anonymous = await browser.newContext();
  const payload = {
    action: "CLAIM",
    orderId: "missing",
    terminalId: randomUUID(),
    generation: 1,
  };
  const unauthenticated = await anonymous.request.post(
    `${baseURL}/api/packing-lease`,
    { headers: { Origin: new URL(baseURL!).origin }, data: payload },
  );
  expect(unauthenticated.status()).toBe(401);
  await anonymous.close();
  const f = await fixture(page),
    origin = new URL(page.url()).origin;
  payload.orderId = f.id;
  expect(
    (
      await page.request.post("/api/packing-lease", {
        headers: { Origin: "https://other.example" },
        data: payload,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/packing-lease", {
        headers: { Origin: origin },
        data: { ...payload, generation: 99 },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post("/api/session", {
        headers: { Origin: origin },
        data: { role: "ACCOUNTANT" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post("/api/packing-lease", {
        headers: { Origin: origin },
        data: payload,
      })
    ).status(),
  ).toBe(403);
});
