import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { database, rows, sql, pool } from "../src/server/db";
import { mutateOrderViews, readOrderViews } from "../src/server/order-views";
import { execute } from "../src/server/execute";
import { snapshot } from "../src/server/snapshot";
import {
  defaultOrderView,
  type OrderViewMutation,
} from "../src/domain/orders/views";
import type { Actor } from "../src/domain/types";

// Run only on an isolated test database/branch, never on the deployed demo DB.
const enabled = process.env.ORDER_VIEWS_DB_TEST === "1";
const w = randomUUID(),
  other = randomUUID();
const admin: Actor = { workspaceId: w, userId: "admin", role: "ADMIN" };
const warehouse: Actor = { ...admin, userId: "warehouse", role: "WAREHOUSE" };
const otherAdmin: Actor = { ...admin, workspaceId: other };
const save = async (actor: Actor, name: string) => {
  const current = await readOrderViews(actor);
  return mutateOrderViews(actor, {
    generation: current.generation,
    revision: current.preferences.revision,
    operation: {
      action: "SAVE",
      view: { id: randomUUID(), name, config: defaultOrderView() },
    },
  });
};

describe.skipIf(!enabled)("order-view PostgreSQL isolation", () => {
  beforeAll(async () => {
    for (const id of [w, other]) {
      await database().execute(
        sql`INSERT INTO workspaces(id,name,settings) VALUES(${id}::uuid,'OPS-02 isolated test','{"autoDraft":true,"keep":"sentinel"}'::jsonb)`,
      );
      await database().execute(
        sql`INSERT INTO users(workspace_id,id,name,role) VALUES(${id}::uuid,'admin','Test admin','ADMIN'),(${id}::uuid,'warehouse','Test warehouse','WAREHOUSE')`,
      );
    }
  });
  afterAll(async () => {
    // UUIDs above belong exclusively to this test; no cloned/default workspace is touched.
    await database().execute(
      sql`DELETE FROM workspaces WHERE id IN (${w}::uuid,${other}::uuid)`,
    );
    await pool().end();
  });
  it("persists only the session owner's views and redacts preferences from the shared snapshot", async () => {
    await save(admin, "Admin saved view");
    expect((await readOrderViews(admin)).preferences.views).toHaveLength(1);
    expect((await readOrderViews(warehouse)).preferences.views).toHaveLength(0);
    expect((await readOrderViews(otherAdmin)).preferences.views).toHaveLength(
      0,
    );
    expect((await snapshot(warehouse)).workspace.settings).toEqual({
      autoDraft: true,
    });
  });
  it("preserves all owners' views when store settings are edited", async () => {
    await save(warehouse, "Warehouse saved view");
    await execute(
      admin,
      { action: "SETTINGS", name: "Changed test store", autoDraft: false },
      randomUUID(),
      1,
    );
    expect((await readOrderViews(admin)).preferences.views).toHaveLength(1);
    expect((await readOrderViews(warehouse)).preferences.views).toHaveLength(1);
    const [row] = await rows<{ settings: Record<string, unknown> }>(
      database(),
      sql`SELECT settings FROM workspaces WHERE id=${w}::uuid`,
    );
    expect(row.settings.keep).toBe("sentinel");
    expect(row.settings.autoDraft).toBe(false);
  });
  it("rejects one of two simultaneous updates from the same revision", async () => {
    const current = await readOrderViews(admin);
    const input = (name: string): OrderViewMutation => ({
      generation: current.generation,
      revision: current.preferences.revision,
      operation: {
        action: "SAVE",
        view: { id: randomUUID(), name, config: defaultOrderView() },
      },
    });
    const result = await Promise.allSettled([
      mutateOrderViews(admin, input("Concurrent A")),
      mutateOrderViews(admin, input("Concurrent B")),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = result.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    expect(failed.reason.status).toBe(409);
    expect((await readOrderViews(admin)).preferences.views).toHaveLength(2);
  });
  it("rejects stale generations and inactive users without changing stored views", async () => {
    const current = await readOrderViews(admin);
    await expect(
      mutateOrderViews(admin, {
        generation: current.generation + 1,
        revision: current.preferences.revision,
        operation: { action: "ACTIVATE", id: null },
      }),
    ).rejects.toMatchObject({ status: 409 });
    await database().execute(
      sql`UPDATE users SET active=false WHERE workspace_id=${w}::uuid AND id='warehouse'`,
    );
    await expect(readOrderViews(warehouse)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      mutateOrderViews(warehouse, {
        generation: 1,
        revision: 1,
        operation: { action: "ACTIVATE", id: null },
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect((await readOrderViews(admin)).preferences.revision).toBe(
      current.preferences.revision,
    );
  });
});
