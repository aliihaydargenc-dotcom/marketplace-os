import type { Role } from "./types";

export const workspaceSections = {
  dashboard: "Operasyon Merkezi",
  orders: "Siparişler",
  packing: "Hazırlama Masası",
  inventory: "Stok & Depo",
  returns: "İade & Kalite Kontrol",
  invoices: "Fatura Merkezi",
  finance: "Finans & Analitik",
  settings: "Sistem Yönetimi",
} as const;

export type WorkspaceSection = keyof typeof workspaceSections;

export function canOpenSection(role: Role, section: WorkspaceSection) {
  if (role === "ADMIN") return true;
  if (role === "WAREHOUSE")
    return !["invoices", "finance", "settings"].includes(section);
  return !["packing", "returns", "settings"].includes(section);
}

export function defaultSection(role: Role): WorkspaceSection {
  return role === "WAREHOUSE"
    ? "packing"
    : role === "ACCOUNTANT"
      ? "invoices"
      : "dashboard";
}

// URL selection is presentation state, never an authorization grant.
export function resolveSection(value: unknown, role: Role): WorkspaceSection {
  if (
    typeof value === "string" &&
    Object.hasOwn(workspaceSections, value) &&
    canOpenSection(role, value as WorkspaceSection)
  )
    return value as WorkspaceSection;
  return defaultSection(role);
}
