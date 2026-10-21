export type Role = "ADMIN" | "WAREHOUSE" | "ACCOUNTANT";
export type OrderStatus =
  | "NEW"
  | "RESERVED"
  | "PACKING"
  | "READY"
  | "SHIPPED"
  | "CANCELLED"
  | "RETURN_PENDING"
  | "RETURNED";
export interface Actor {
  workspaceId: string;
  userId: string;
  role: Role;
}
export interface Product {
  active?: boolean;
  catalog_version?: number;
  source?: {
    provider?: string;
    externalId?: string;
    url?: string;
    reviewedAt?: string;
    pricing?: string;
  };
  id: string;
  sku: string;
  name: string;
  variant: string;
  barcode: string;
  category: string;
  cost_try: number | null;
  price_rub: number;
  threshold: number;
  physical: number;
  reserved: number;
  available: number;
  quarantine: number;
}
export interface OrderLine {
  order_id: string;
  product_id: string;
  quantity: number;
  packed: number;
  unit_price: number;
  unit_cost_try: number | null;
}
export interface Order {
  id: string;
  number: string;
  customer: string;
  fulfillment: "FBS" | "FBO";
  status: OrderStatus;
  currency: "RUB" | "TRY";
  created_at: string;
  shipped_at: string | null;
  fx_date: string;
  fx_rate: number;
  commission_bps: number;
  logistics: number;
  lines: OrderLine[];
  total: number;
  invoice_id?: string;
  invoice_status?: string;
  tracking?: string;
}
export interface Ledger {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  kind: string;
  reference: string;
  reason: string;
  actor: string;
  created_at: string;
}
export interface FinancialEntry {
  id: string;
  order_id: string;
  kind: string;
  amount: number;
  currency: "RUB" | "TRY";
  created_at: string;
}
export interface AuditEvent {
  id: string;
  reference: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}
export interface Invoice {
  id: string;
  order_id: string;
  status: "DRAFT" | "CANCELLED" | "ERROR";
  label: "DEMO / TASLAK";
  created_at: string;
  error: string | null;
}
export interface ReturnRecord {
  order_id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  reason: string;
  created_at: string;
  reviewed_at: string | null;
}
export interface User {
  id: string;
  name: string;
  role: Role;
  active: boolean;
}
export interface WorkspaceSnapshot {
  workspace: {
    id: string;
    name: string;
    generation: number;
    settings: { autoDraft?: boolean };
  };
  actor: Actor;
  products: Product[];
  orders: Order[];
  ledger: Ledger[];
  financial: FinancialEntry[];
  invoices: Invoice[];
  returns: ReturnRecord[];
  audit: AuditEvent[];
  users: User[];
}
export const statusLabels: Record<OrderStatus, string> = {
  NEW: "Yeni",
  RESERVED: "Rezerve",
  PACKING: "Hazırlanıyor",
  READY: "Sevke hazır",
  SHIPPED: "Sevk edildi",
  CANCELLED: "İptal",
  RETURN_PENDING: "İade kontrolde",
  RETURNED: "İade tamamlandı",
};
export const roleLabels: Record<Role, string> = {
  ADMIN: "Yönetici",
  WAREHOUSE: "Depo personeli",
  ACCOUNTANT: "Muhasebe",
};
