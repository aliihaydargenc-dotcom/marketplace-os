import {
  createInventoryDocumentSchema,
  updateInventoryDocumentSchema,
  confirmInventoryDocumentSchema,
  cancelInventoryDocumentSchema,
} from "@/domain/inventory/documents";
import { z } from "zod";
import {
  createProductSchema,
  updateProductSchema,
  importOzonDemoSchema,
} from "@/domain/catalog/commands";
const id = z.string().min(1).max(100);
const reason = z.string().trim().min(3).max(300);
export const commandSchema = z.discriminatedUnion("action", [
  createProductSchema,
  updateProductSchema,
  importOzonDemoSchema,
  createInventoryDocumentSchema,
  updateInventoryDocumentSchema,
  confirmInventoryDocumentSchema,
  cancelInventoryDocumentSchema,
  z.object({
    action: z.literal("CREATE_ORDER"),
    customer: z.string().trim().min(2).max(100),
    currency: z.enum(["RUB", "TRY"]),
    fxRate: z.number().int().min(1).max(100000000),
    fxDate: z.iso.date(),
    commissionBps: z.number().int().min(0).max(10000),
    logistics: z.number().int().min(0).max(10000000),
    lines: z
      .array(
        z.object({
          productId: id,
          quantity: z.number().int().min(1).max(1000),
        }),
      )
      .min(1)
      .max(30),
  }),
  z.object({ action: z.literal("RESERVE"), orderId: id }),
  z.object({
    action: z.literal("SCAN"),
    orderId: id,
    barcode: id,
    // Optional so existing clients continue to work. New packing terminal detects stale tabs.
    expectedPackedTotal: z.number().int().min(0).max(30000).optional(),
  }),
  z.object({ action: z.literal("SHIP"), orderId: id }),
  z.object({ action: z.literal("CANCEL"), orderId: id, reason }),
  z.object({ action: z.literal("RETURN"), orderId: id, reason }),
  z.object({
    action: z.literal("QC"),
    orderId: id,
    accept: z.boolean(),
    reason,
  }),
  z
    .object({
      action: z.literal("CORRECT_MISSING_COST"),
      orderId: id,
      productId: id,
      costTry: z.number().int().min(0).max(10000000),
      reason,
    })
    .strict(),
  z.object({ action: z.literal("INVOICE"), orderId: id }),
  z.object({
    action: z.literal("INVOICE_STATUS"),
    orderId: id,
    status: z.enum(["DRAFT", "ERROR", "CANCELLED"]),
    reason,
  }),
  z.object({
    action: z.literal("ADJUST"),
    productId: id,
    quantity: z
      .number()
      .int()
      .min(-100000)
      .max(100000)
      .refine((x) => x !== 0),
    reason,
  }),
  z.object({
    action: z.literal("PRODUCT"),
    productId: id,
    costTry: z.number().int().min(0).max(10000000).nullable(),
    threshold: z.number().int().min(0).max(100000),
  }),
  z.object({
    action: z.literal("SETTINGS"),
    name: z.string().trim().min(2).max(80),
    autoDraft: z.boolean(),
  }),
  z.object({
    action: z.literal("USER"),
    userId: id,
    name: z.string().trim().min(2).max(80),
    role: z.enum(["ADMIN", "WAREHOUSE", "ACCOUNTANT"]),
    active: z.boolean(),
  }),
  z.object({ action: z.literal("RESET"), confirmation: z.literal("SIFIRLA") }),
]);
export type Command = z.infer<typeof commandSchema>;
export const requestSchema = z.object({
  key: z.uuid(),
  generation: z.number().int().positive(),
  command: commandSchema,
});
