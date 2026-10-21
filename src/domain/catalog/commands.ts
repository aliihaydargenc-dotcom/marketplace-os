import { z } from "zod";
const identity = {
  sku: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "SKU yalnız harf, rakam, nokta, tire içerebilir",
    )
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  variant: z.string().trim().min(1).max(100),
  barcode: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[A-Za-z0-9._-]+$/, "Barkod boşluk veya özel karakter içeremez"),
  category: z.string().trim().min(2).max(80),
};
export const catalogFields = z
  .object({
    ...identity,
    priceRub: z.number().int().min(1).max(10000000),
    costTry: z.number().int().min(0).max(10000000).nullable(),
    threshold: z.number().int().min(0).max(100000),
    active: z.boolean(),
  })
  .strict();
export const createProductSchema = catalogFields.extend({
  action: z.literal("CREATE_PRODUCT"),
});
export const updateProductSchema = catalogFields.extend({
  action: z.literal("UPDATE_CATALOG"),
  productId: z.string().min(1).max(100),
  version: z.number().int().min(0),
});
export const importOzonDemoSchema = z.object({
  action: z.literal("IMPORT_OZON_DEMO"),
});
export type CatalogCommand =
  | z.infer<typeof createProductSchema>
  | z.infer<typeof updateProductSchema>
  | z.infer<typeof importOzonDemoSchema>;
