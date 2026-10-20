import { readFile, readdir } from "node:fs/promises";
import { database, sql, pool } from "../src/server/db";
for (const file of (await readdir("db"))
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  await database().transaction(async (tx) => {
    await tx.execute(sql.raw(await readFile(`db/${file}`, "utf8")));
  });
  console.log(`Migration ${file} applied`);
}
await pool().end();
