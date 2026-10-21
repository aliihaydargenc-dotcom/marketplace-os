import type { Role } from "./types";
export const permissions = {
  CREATE_ORDER: ["ADMIN"],
  RESERVE: ["ADMIN", "WAREHOUSE"],
  SCAN: ["ADMIN", "WAREHOUSE"],
  SHIP: ["ADMIN", "WAREHOUSE"],
  CANCEL: ["ADMIN"],
  RETURN: ["ADMIN", "WAREHOUSE"],
  QC: ["ADMIN", "WAREHOUSE"],
  CORRECT_MISSING_COST: ["ADMIN", "ACCOUNTANT"],
  INVOICE: ["ADMIN", "ACCOUNTANT"],
  INVOICE_STATUS: ["ADMIN", "ACCOUNTANT"],
  CREATE_INVENTORY_DOCUMENT: ["ADMIN", "WAREHOUSE"],
  UPDATE_INVENTORY_DOCUMENT: ["ADMIN", "WAREHOUSE"],
  CONFIRM_INVENTORY_DOCUMENT: ["ADMIN", "WAREHOUSE"],
  CANCEL_INVENTORY_DOCUMENT: ["ADMIN", "WAREHOUSE"],
  ADJUST: ["ADMIN", "WAREHOUSE"],
  PRODUCT: ["ADMIN"],
  CREATE_PRODUCT: ["ADMIN"],
  UPDATE_CATALOG: ["ADMIN"],
  IMPORT_OZON_DEMO: ["ADMIN"],
  SETTINGS: ["ADMIN"],
  USER: ["ADMIN"],
  RESET: ["ADMIN"],
  REPORT: ["ADMIN", "ACCOUNTANT"],
} satisfies Record<string, Role[]>;
export type Action = keyof typeof permissions;
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
export function authorize(role: Role, action: Action) {
  if (!(permissions[action] as readonly Role[]).includes(role))
    throw new DomainError("Bu işlem için yetkiniz yok", 403);
}
