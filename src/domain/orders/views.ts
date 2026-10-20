import { z } from "zod";
import type { Order, Product } from "../types";
import { DomainError } from "../permissions";

export const orderColumnIds = [
  "number",
  "created_at",
  "fulfillment",
  "status",
  "items",
  "total",
  "invoice",
] as const;
export const orderFilterSchema = z
  .object({
    query: z.string().trim().max(200),
    status: z.enum([
      "ALL",
      "NEW",
      "RESERVED",
      "PACKING",
      "READY",
      "SHIPPED",
      "CANCELLED",
      "RETURN_PENDING",
      "RETURNED",
    ]),
    fulfillment: z.enum(["ALL", "FBS", "FBO"]),
    from: z.union([z.literal(""), z.iso.date()]),
    to: z.union([z.literal(""), z.iso.date()]),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, {
    message: "Başlangıç tarihi bitişten sonra olamaz",
  });

export const orderLayoutSchema = z.object({
  sorting: z
    .array(z.object({ id: z.enum(orderColumnIds), desc: z.boolean() }))
    .max(3),
  visibility: z
    .partialRecord(z.enum(orderColumnIds), z.boolean())
    .refine((v) => v.number !== false, {
      message: "Sipariş sütunu gizlenemez",
    }),
  pageSize: z.union([z.literal(20), z.literal(50), z.literal(100)]),
});
export type OrderFilters = z.infer<typeof orderFilterSchema>;
export type OrderLayout = z.infer<typeof orderLayoutSchema>;
export const orderViewConfigSchema = z.object({
  filters: orderFilterSchema,
  layout: orderLayoutSchema,
});
export type OrderViewConfig = z.infer<typeof orderViewConfigSchema>;
export const savedOrderViewSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(50),
  config: orderViewConfigSchema,
});
export const orderViewPreferencesSchema = z.object({
  schemaVersion: z.literal(1),
  revision: z.number().int().nonnegative(),
  activeId: z.uuid().nullable(),
  views: z.array(savedOrderViewSchema).max(12),
});
export type OrderViewPreferences = z.infer<typeof orderViewPreferencesSchema>;
export const emptyViewPreferences = (): OrderViewPreferences => ({
  schemaVersion: 1,
  revision: 0,
  activeId: null,
  views: [],
});
export const defaultOrderView = (): OrderViewConfig => ({
  filters: { query: "", status: "ALL", fulfillment: "ALL", from: "", to: "" },
  layout: { sorting: [], visibility: {}, pageSize: 20 },
});
export const orderViewMutationSchema = z.object({
  revision: z.number().int().nonnegative(),
  generation: z.number().int().positive(),
  operation: z.discriminatedUnion("action", [
    z.object({ action: z.literal("SAVE"), view: savedOrderViewSchema }),
    z.object({ action: z.literal("ACTIVATE"), id: z.uuid().nullable() }),
    z.object({ action: z.literal("DELETE"), id: z.uuid() }),
  ]),
});
export type OrderViewMutation = z.infer<typeof orderViewMutationSchema>;

export function applyViewOperation(
  current: OrderViewPreferences,
  operation: OrderViewMutation["operation"],
): OrderViewPreferences {
  let views = [...current.views];
  let activeId = current.activeId;
  if (operation.action === "SAVE") {
    const name = operation.view.name.toLocaleLowerCase("tr-TR");
    if (
      views.some(
        (v) =>
          v.id !== operation.view.id &&
          v.name.toLocaleLowerCase("tr-TR") === name,
      )
    )
      throw new DomainError("Bu adla bir görünüm zaten var", 409);
    const existing = views.findIndex((v) => v.id === operation.view.id);
    if (existing < 0 && views.length >= 12)
      throw new DomainError(
        "En fazla 12 kişisel görünüm kaydedebilirsiniz",
        409,
      );
    if (existing < 0) views.push(operation.view);
    else views[existing] = operation.view;
    activeId = operation.view.id;
  } else if (operation.action === "DELETE") {
    if (!views.some((v) => v.id === operation.id))
      throw new DomainError("Görünüm bulunamadı", 404);
    views = views.filter((v) => v.id !== operation.id);
    if (activeId === operation.id) activeId = null;
  } else {
    if (operation.id && !views.some((v) => v.id === operation.id))
      throw new DomainError("Görünüm bulunamadı", 404);
    activeId = operation.id;
  }
  return { schemaVersion: 1, revision: current.revision + 1, activeId, views };
}

export function filterOrders(
  orders: Order[],
  products: Product[],
  filters: OrderFilters,
) {
  const catalog = new Map(products.map((p) => [p.id, p]));
  const q = filters.query.trim().toLocaleLowerCase("tr-TR");
  const calendar = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return orders.filter((o) => {
    const day =
      filters.from || filters.to ? calendar.format(new Date(o.created_at)) : "";
    if (
      (filters.status !== "ALL" && filters.status !== o.status) ||
      (filters.fulfillment !== "ALL" &&
        filters.fulfillment !== o.fulfillment) ||
      (filters.from && day < filters.from) ||
      (filters.to && day > filters.to)
    )
      return false;
    if (!q) return true;
    return [
      o.number,
      o.customer,
      ...o.lines.flatMap((l) => {
        const p = catalog.get(l.product_id);
        return p ? [p.sku, p.name, p.barcode, p.variant] : [];
      }),
    ]
      .join(" ")
      .toLocaleLowerCase("tr-TR")
      .includes(q);
  });
}

export function bulkEligibility(order: Order, action: "RESERVE" | "SHIP") {
  if (order.fulfillment !== "FBS") return "FBO yalnızca referans kaydıdır";
  if (action === "RESERVE")
    return order.status === "NEW"
      ? null
      : "Yalnız yeni sipariş rezerve edilebilir";
  if (order.status !== "READY") return "Sipariş sevke hazır değil";
  return order.lines.length && order.lines.every((l) => l.packed === l.quantity)
    ? null
    : "Ürün doğrulaması tamamlanmamış";
}

export function sameViewConfig(a: OrderViewConfig, b: OrderViewConfig) {
  const canonical = (v: OrderViewConfig) =>
    JSON.stringify({
      filters: v.filters,
      sorting: v.layout.sorting,
      pageSize: v.layout.pageSize,
      visible: orderColumnIds.map((id) => v.layout.visibility[id] !== false),
    });
  return canonical(a) === canonical(b);
}
