import { Pool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { Pool as PostgresPool } from "pg";
import { HttpsProxyAgent } from "https-proxy-agent";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
// Only the development host requires an outbound proxy. Vercel uses direct WSS.
neonConfig.webSocketConstructor = process.env.HTTPS_PROXY
  ? class extends WebSocket {
      constructor(address: string, protocols?: string | string[]) {
        super(address, protocols, {
          agent: new HttpsProxyAgent(process.env.HTTPS_PROXY!),
        });
      }
    }
  : WebSocket;
const globalDb = globalThis as unknown as { marketplacePool?: Pool };
export function pool() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL yapılandırılmamış");
  if (!globalDb.marketplacePool) {
    const config = {
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 15000,
    };
    // Neon exposes the pg Pool interface over WSS; ordinary Postgres uses TCP.
    globalDb.marketplacePool = new URL(
      process.env.DATABASE_URL,
    ).hostname.endsWith(".neon.tech")
      ? new Pool(config)
      : (new PostgresPool(config) as unknown as Pool);
  }
  return globalDb.marketplacePool;
}
export function database() {
  return drizzle(pool());
}
export type Db = ReturnType<typeof database>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Conn = Db | Tx;
export async function rows<T>(db: Conn, query: ReturnType<typeof sql>) {
  return (await db.execute(query)).rows as T[];
}
export async function transaction<T>(
  workspaceId: string,
  fn: (tx: Tx) => Promise<T>,
) {
  return database().transaction(async (tx) => {
    const found = await rows(
      tx,
      sql`SELECT id FROM workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`,
    );
    if (!found.length) throw new Error("Demo alanı bulunamadı");
    return fn(tx);
  });
}
export { sql };
