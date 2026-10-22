import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { database, pool, rows, sql } from "../src/server/db";
import { snapshot } from "../src/server/snapshot";
import {
  groupPackingQueue,
  filterPackingQueue,
  packingPage,
} from "../src/domain/orders/packing";
import { operationalTasks } from "../src/domain/operations/action-center";
import type { Actor } from "../src/domain/types";

const workspaceId = randomUUID();
const admin: Actor = { workspaceId, userId: "ux03-admin", role: "ADMIN" };
const warehouse: Actor = {
  workspaceId,
  userId: "ux03-warehouse",
  role: "WAREHOUSE",
};

describe.skipIf(process.env.UX03_SCALE_DB_TEST !== "1")(
  "UX03 final PostgreSQL scale and multi-order acceptance",
  () => {
    beforeAll(async () => {
      await database().transaction(async (tx) => {
        await tx.execute(
          sql`INSERT INTO workspaces(id,name,settings) VALUES(${workspaceId}::uuid,'UX03 isolated acceptance','{"autoDraft":true}')`,
        );
        await tx.execute(sql`INSERT INTO users(workspace_id,id,name,role)
           VALUES(${workspaceId}::uuid,'ux03-admin','UX03 Admin','ADMIN'),
           (${workspaceId}::uuid,'ux03-warehouse','UX03 Warehouse','WAREHOUSE')`);
        await tx.execute(
          sql`INSERT INTO stores VALUES(${workspaceId}::uuid,'scale-store','UX03 QA')`,
        );
        await tx.execute(sql`INSERT INTO warehouses VALUES(${workspaceId}::uuid,'MAIN','QA main','SELLABLE'),
           (${workspaceId}::uuid,'QUARANTINE','QA QC','QUARANTINE')`);
        await tx.execute(sql`INSERT INTO products
          (workspace_id,id,sku,name,variant,barcode,category,cost_try,price_rub,threshold)
          SELECT ${workspaceId}::uuid, 'blocked-'||n,'BLOCK-'||n,'Stok engelli ürün '||n,'Mavi','BLOCKBAR-'||n,'QA',100,500,1
          FROM generate_series(0,2) AS n`);
        await tx.execute(sql`INSERT INTO products
          (workspace_id,id,sku,name,variant,barcode,category,cost_try,price_rub,threshold)
          VALUES(${workspaceId}::uuid,'ok','SCALE-OK','İnce havlu','Mavi','8690000000000','QA',100,500,1)`);
        await tx.execute(sql`INSERT INTO stock_ledger
          VALUES(${workspaceId}::uuid,${randomUUID()},'ok','MAIN',5000,'OPENING','qa-initial','UX03 fixture','ux03-admin',now())`);
        await tx.execute(sql`INSERT INTO orders
          (workspace_id,id,store_id,number,customer,fulfillment,status,currency,
           created_at,shipped_at,fx_date,fx_rate,commission_bps,logistics)
          SELECT ${workspaceId}::uuid,'scale-'||n,'scale-store','UX03-'||lpad(n::text,4,'0'),
           'Ölçek alıcısı '||lpad(n::text,4,'0'),
           CASE WHEN n>=30 AND n%20=0 THEN 'FBO' ELSE 'FBS' END,
           CASE WHEN n>=30 AND n%19=0 THEN 'SHIPPED'
                WHEN n<3 THEN 'NEW'
                WHEN n%4=0 THEN 'READY'
                WHEN n%4=1 THEN 'RESERVED'
                WHEN n%4=2 THEN 'PACKING'
                ELSE 'NEW' END,
           'TRY', '2026-10-20 00:00:00+03'::timestamptz + n * interval '1 second',
           CASE WHEN n>=30 AND n%19=0
             THEN '2026-10-20 01:00:00+03'::timestamptz + n * interval '1 second'
             ELSE null::timestamptz END,
           '2026-10-20'::date,1000000,0,0
          FROM generate_series(0,1204) AS n`);
        await tx.execute(sql`INSERT INTO order_lines
          (workspace_id,order_id,product_id,quantity,packed,unit_price,unit_cost_try)
          SELECT ${workspaceId}::uuid,'scale-'||n,
           CASE WHEN n<3 THEN 'blocked-'||n ELSE 'ok' END,
           2,CASE WHEN n>=3 AND n%4=0 THEN 2 ELSE 0 END,500,100
          FROM generate_series(0,1204) AS n`);
      });
    });
    afterAll(async () => {
      try {
        await database().execute(
          sql`DELETE FROM workspaces WHERE id=${workspaceId}::uuid`,
        );
      } finally {
        await pool().end();
      }
    });

    it("reads all 1,205 real PostgreSQL orders and orders their lines without loss", async () => {
      const before = performance.now();
      const data = await snapshot(admin);
      const elapsedMs = Math.round(performance.now() - before);
      expect(data.orders).toHaveLength(1205);
      expect(data.orders.every((o) => o.lines.length === 1)).toBe(true);
      expect(new Set(data.orders.map((o) => o.number)).size).toBe(1205);
      expect(data.orders.every((o) => o.lines[0].quantity === 2)).toBe(true);
      const groups = groupPackingQueue(data.orders, data.products);
      expect(groups.BLOCKED.map((o) => o.id).sort()).toEqual([
        "scale-0",
        "scale-1",
        "scale-2",
      ]);
      expect(groups.ALL.length).toBeGreaterThan(1000);
      console.info("UX03 real PostgreSQL scale:", {
        orders: data.orders.length,
        pending: groups.ALL.length,
        blocked: groups.BLOCKED.length,
        snapshotMs: elapsedMs,
      });
    });
    it("keeps a 30-order mixed sample with 3 blockers and no FBO shipping actions", async () => {
      const data = await snapshot(warehouse);
      const first30 = data.orders.filter((o) =>
        /^scale-(?:[0-9]|1[0-9]|2[0-9])$/.test(o.id),
      );
      expect(first30).toHaveLength(30);
      const firstGroups = groupPackingQueue(first30, data.products);
      expect(firstGroups.BLOCKED).toHaveLength(3);
      expect(firstGroups.READY.length).toBeGreaterThan(0);
      expect(firstGroups.ACTIVE.length).toBeGreaterThan(0);
      expect(firstGroups.NEW.length).toBeGreaterThan(0);
      expect(data.invoices).toHaveLength(0);
      expect(data.financial).toHaveLength(0);
      const tasks = operationalTasks({ ...data, orders: first30 });
      expect(
        tasks.filter((task) => task.id.startsWith("stock-block:")),
      ).toHaveLength(3);
      expect(
        tasks.every(
          (task) => task.target !== "finance" && task.target !== "invoices",
        ),
      ).toBe(true);
    });
    it("finds late records and paginates the full PostgreSQL-backed queue", async () => {
      const data = await snapshot(admin);
      const groups = groupPackingQueue(data.orders, data.products);
      const matches = filterPackingQueue(
        groups.ALL,
        data.products,
        "ÖLÇEK ALICISI 1199",
      );
      expect(matches.map((o) => o.id)).toEqual(["scale-1199"]);
      expect(
        packingPage(groups.ALL, 80, groups.ALL.at(-1)?.id ?? null),
      ).toHaveLength(81);
      expect(packingPage(groups.ALL, 80, null)).toHaveLength(80);
      expect(
        filterPackingQueue(groups.ALL, data.products, "8690000000000").length,
      ).toBeGreaterThan(1000);
    });
  },
);
