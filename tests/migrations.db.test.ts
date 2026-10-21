import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

async function isolatedDatabase(check: (client: Client) => Promise<void>) {
  const url = new URL(process.env.DATABASE_URL!);
  // This suite creates its own disposable DB; never operate on the input DB.
  const name = `ux03_migration_${randomUUID().replaceAll("-", "")}`;
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  let client: Client | undefined;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`;
    client = new Client({ connectionString: url.toString() });
    await client.connect();
    await check(client);
  } finally {
    await client?.end();
    await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
    await admin.end();
  }
}
async function apply(client: Client, files: string[]) {
  for (const file of files) {
    await client.query("BEGIN");
    try {
      await client.query(await readFile(`db/${file}`, "utf8"));
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

describe.skipIf(process.env.MIGRATION_DB_TEST !== "1")(
  "UX03 PostgreSQL migrations",
  () => {
    it("applies all nine migrations to an empty DB and replays them without schema drift", async () => {
      await isolatedDatabase(async (client) => {
        const files = (await readdir("db"))
          .filter((f) => f.endsWith(".sql"))
          .sort();
        expect(files).toHaveLength(9);
        await apply(client, files);
        const schema = () =>
          client.query(
            "SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position",
          );
        const before = (await schema()).rows;
        await apply(client, files);
        expect((await schema()).rows).toEqual(before);
        const constraints = (
          await client.query(
            "SELECT contype FROM pg_constraint WHERE conrelid='packing_claims'::regclass AND contype IN ('f','p') ORDER BY contype",
          )
        ).rows;
        expect(constraints.map((r) => r.contype)).toEqual(["f", "f", "p"]);
        expect(
          (
            await client.query(
              "SELECT indexname FROM pg_indexes WHERE tablename='packing_claims' AND indexname='packing_claims_expiry_idx'",
            )
          ).rowCount,
        ).toBe(1);
      });
    });

    it("upgrades 0001–0007 with existing orders, enforces claim isolation and cascades deletion", async () => {
      await isolatedDatabase(async (client) => {
        const files = (await readdir("db"))
          .filter((f) => f.endsWith(".sql"))
          .sort();
        await apply(client, files.slice(0, 7));
        const w = randomUUID(),
          other = randomUUID(),
          terminal = randomUUID();
        for (const id of [w, other]) {
          await client.query(
            "INSERT INTO workspaces(id,name) VALUES($1,'Migration fixture')",
            [id],
          );
          await client.query(
            "INSERT INTO users(workspace_id,id,name,role) VALUES($1,'admin','QA','ADMIN')",
            [id],
          );
          await client.query("INSERT INTO stores VALUES($1,'ozon-demo','QA')", [
            id,
          ]);
        }
        await client.query(
          "INSERT INTO orders VALUES($1,'existing-order','ozon-demo','QA-001','Fixture','FBS','NEW','TRY',now(),null,'2026-10-21',1000000,0,0)",
          [w],
        );
        const before = (await client.query("SELECT * FROM orders")).rows;
        await apply(client, [...files.slice(7), ...files.slice(7)]);
        expect((await client.query("SELECT * FROM orders")).rows).toEqual(
          before,
        );
        const insert =
          "INSERT INTO packing_claims(workspace_id,order_id,terminal_id,user_id,expires_at) VALUES($1,'existing-order',$2,'admin',now()+interval '120 seconds')";
        await client.query(insert, [w, terminal]);
        expect(
          (
            await client.query(
              "SELECT condeferrable,condeferred FROM pg_constraint WHERE conrelid='packing_claims'::regclass AND contype='f'",
            )
          ).rows,
        ).toEqual([
          { condeferrable: true, condeferred: true },
          { condeferrable: true, condeferred: true },
        ]);
        await expect(
          client.query(insert, [w, randomUUID()]),
        ).rejects.toMatchObject({ code: "23505" });
        await expect(
          client.query(insert, [other, randomUUID()]),
        ).rejects.toMatchObject({ code: "23503" });
        await client.query("DELETE FROM workspaces WHERE id=$1", [w]);
        expect(
          (await client.query("SELECT * FROM packing_claims")).rowCount,
        ).toBe(0);
        expect(
          (await client.query("SELECT * FROM workspaces WHERE id=$1", [other]))
            .rowCount,
        ).toBe(1);
      });
    });
  },
);
