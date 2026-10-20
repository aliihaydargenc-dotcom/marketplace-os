import type { Actor } from "@/domain/types";
import { DomainError } from "@/domain/permissions";
import {
  applyViewOperation,
  emptyViewPreferences,
  orderViewMutationSchema,
  orderViewPreferencesSchema,
  type OrderViewMutation,
} from "@/domain/orders/views";
import { database, rows, sql, transaction, type Conn } from "./db";

function preferences(value: unknown) {
  if (value == null) return emptyViewPreferences();
  const result = orderViewPreferencesSchema.safeParse(value);
  if (!result.success)
    throw new DomainError("Kayıtlı görünüm biçimi okunamadı", 409);
  return result.data;
}

// The actor comes only from the HttpOnly session; callers cannot submit another owner.
export async function readOrderViews(actor: Actor, conn: Conn = database()) {
  const [record] = await rows<{ generation: number; preference: unknown }>(
    conn,
    sql`SELECT w.generation,w.settings->'orderViewPreferences'->${actor.userId}::text preference FROM workspaces w JOIN users u ON u.workspace_id=w.id AND u.id=${actor.userId} WHERE w.id=${actor.workspaceId}::uuid AND u.active=true`,
  );
  if (!record)
    throw new DomainError("Aktif kullanıcı veya demo alanı bulunamadı", 403);
  return {
    generation: record.generation,
    preferences: preferences(record.preference),
  };
}

export async function mutateOrderViews(actor: Actor, input: OrderViewMutation) {
  const mutation = orderViewMutationSchema.parse(input);
  return transaction(actor.workspaceId, async (tx) => {
    const current = await readOrderViews(actor, tx);
    if (current.generation !== mutation.generation)
      throw new DomainError("Demo sıfırlandı; sayfayı yenileyin", 409);
    if (current.preferences.revision !== mutation.revision)
      throw new DomainError(
        "Görünümler başka bir sekmede değişti. Görünümleri yeniden yükleyin.",
        409,
      );
    const next = applyViewOperation(current.preferences, mutation.operation);
    // Merge only this user's preference under the locked workspace, preserving autoDraft and other users.
    await tx.execute(
      sql`UPDATE workspaces SET settings=jsonb_set(settings,'{orderViewPreferences}',COALESCE(settings->'orderViewPreferences','{}'::jsonb) || jsonb_build_object(${actor.userId}::text,${JSON.stringify(next)}::jsonb),true) WHERE id=${actor.workspaceId}::uuid`,
    );
    return { generation: current.generation, preferences: next };
  });
}
