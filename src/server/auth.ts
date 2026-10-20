import { cookies } from "next/headers";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { database, rows, sql } from "./db";
import { seed } from "./seed";
import type { Actor, Role } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
const COOKIE = "mos_session";
export const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function resolveSession(token?: string): Promise<Actor | null> {
  if (!token) return null;
  const [session] = await rows<{
    workspace_id: string;
    user_id: string;
    role: Role;
  }>(
    database(),
    sql`SELECT s.workspace_id,s.user_id,u.role FROM sessions s JOIN users u ON u.workspace_id=s.workspace_id AND u.id=s.user_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND u.active=true`,
  );
  return session
    ? {
        workspaceId: session.workspace_id,
        userId: session.user_id,
        role: session.role,
      }
    : null;
}
export async function currentActor() {
  return resolveSession((await cookies()).get(COOKIE)?.value);
}
export async function actor() {
  const session = await currentActor();
  if (!session) throw new DomainError("Demo oturumu açın", 401);
  return session;
}
export async function openSession(role: Role) {
  const jar = await cookies(),
    existing = await resolveSession(jar.get(COOKIE)?.value);
  const workspaceId = existing?.workspaceId ?? randomUUID(),
    token = randomBytes(32).toString("hex");
  await database().transaction(async (tx) => {
    if (!existing) {
      await tx.execute(
        sql`INSERT INTO workspaces(id,name,settings) VALUES(${workspaceId}::uuid,'Pazar Ticaret Demo','{"autoDraft":false}')`,
      );
      await tx.execute(
        sql`INSERT INTO users(workspace_id,id,name,role) VALUES(${workspaceId}::uuid,'admin','Demo Yönetici','ADMIN'),(${workspaceId}::uuid,'warehouse','Demo Depo','WAREHOUSE'),(${workspaceId}::uuid,'accountant','Demo Muhasebe','ACCOUNTANT')`,
      );
      await seed(tx, workspaceId);
    }
    const userId = {
      ADMIN: "admin",
      WAREHOUSE: "warehouse",
      ACCOUNTANT: "accountant",
    }[role];
    const [user] = await rows(
      tx,
      sql`SELECT id FROM users WHERE workspace_id=${workspaceId}::uuid AND id=${userId} AND active=true`,
    );
    if (!user) throw new DomainError("Bu demo kullanıcısı pasif", 403);
    if (existing)
      await tx.execute(
        sql`DELETE FROM sessions WHERE token_hash=${hash(jar.get(COOKIE)!.value)}`,
      );
    await tx.execute(
      sql`INSERT INTO sessions VALUES(${hash(token)},${workspaceId}::uuid,${userId},now()+interval '7 days')`,
    );
  });
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  });
  return workspaceId;
}
export async function closeSession() {
  const jar = await cookies(),
    token = jar.get(COOKIE)?.value;
  if (token)
    await database().execute(
      sql`DELETE FROM sessions WHERE token_hash=${hash(token)}`,
    );
  jar.delete(COOKIE);
}
