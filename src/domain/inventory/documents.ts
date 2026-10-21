import { z } from "zod";
const fields = {
  sourceReference: z.string().trim().min(3).max(120),
  sourceOrderId: z.string().min(1).max(100).nullable(),
  reason: z.string().trim().min(3).max(300),
  lines: z
    .array(
      z
        .object({
          productId: z.string().min(1).max(100),
          quantity: z.number().int().min(0).max(100000),
        })
        .strict(),
    )
    .min(1)
    .max(30),
};
export const createInventoryDocumentSchema = z
  .object({
    action: z.literal("CREATE_INVENTORY_DOCUMENT"),
    kind: z.enum(["RECEIPT", "COUNT"]),
    ...fields,
  })
  .strict();
export const updateInventoryDocumentSchema = z
  .object({
    action: z.literal("UPDATE_INVENTORY_DOCUMENT"),
    documentId: z.uuid(),
    version: z.number().int().nonnegative(),
    ...fields,
  })
  .strict();
export const confirmInventoryDocumentSchema = z
  .object({
    action: z.literal("CONFIRM_INVENTORY_DOCUMENT"),
    documentId: z.uuid(),
    version: z.number().int().nonnegative(),
  })
  .strict();
export const cancelInventoryDocumentSchema = z
  .object({
    action: z.literal("CANCEL_INVENTORY_DOCUMENT"),
    documentId: z.uuid(),
    version: z.number().int().nonnegative(),
    reason: z.string().trim().min(3).max(300),
  })
  .strict();
export interface InventoryDocumentLine {
  product_id: string;
  quantity: number;
  expected_physical: number;
  delta: number | null;
}
export interface InventoryDocument {
  id: string;
  kind: "RECEIPT" | "COUNT";
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  source_reference: string;
  source_order_id: string | null;
  reason: string;
  version: number;
  created_by: string;
  created_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  lines: InventoryDocumentLine[];
}
