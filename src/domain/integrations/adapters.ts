import type { Order, Product, FinancialEntry, Invoice } from "../types";
export interface IntegrationReceipt {
  mode: "demo" | "live";
  sent: boolean;
  externalId: string | null;
  requestId?: string;
}
export interface StockUpdate {
  externalProductId: string;
  externalWarehouseId: string;
  available: number;
}
export interface PriceUpdate {
  externalProductId: string;
  priceMinor: number;
  currency: "RUB" | "TRY";
}
export interface StatusUpdate {
  externalOrderId: string;
  externalStatus: string;
  idempotencyKey: string;
}
export type DocumentStatus =
  "NOT_SENT" | "DRAFT" | "PROCESSING" | "ISSUED" | "CANCELLED" | "ERROR";
export interface OzonAdapter {
  readonly mode: "demo" | "live";
  capabilities(): {
    orders: boolean;
    products: boolean;
    stock: boolean;
    prices: boolean;
    finance: boolean;
    statusSync: boolean;
    fbo: boolean;
  };
  orders(): Promise<Order[]>;
  products(): Promise<Product[]>;
  financialTransactions(): Promise<FinancialEntry[]>;
  syncStock(updates: StockUpdate[]): Promise<IntegrationReceipt>;
  syncPrices(updates: PriceUpdate[]): Promise<IntegrationReceipt>;
  syncStatus(update: StatusUpdate): Promise<IntegrationReceipt>;
}
export class DemoOzonAdapter implements OzonAdapter {
  readonly mode = "demo" as const;
  constructor(
    private source: {
      orders: Order[];
      products: Product[];
      financial: FinancialEntry[];
    },
  ) {}
  capabilities() {
    return {
      orders: true,
      products: true,
      stock: false,
      prices: false,
      finance: true,
      statusSync: false,
      fbo: false,
    };
  }
  async orders() {
    return this.source.orders;
  }
  async products() {
    return this.source.products;
  }
  async financialTransactions() {
    return this.source.financial;
  }
  async syncStock(updates: StockUpdate[]): Promise<IntegrationReceipt> {
    void updates;
    return { mode: "demo", sent: false, externalId: null };
  }
  async syncPrices(updates: PriceUpdate[]): Promise<IntegrationReceipt> {
    void updates;
    return { mode: "demo", sent: false, externalId: null };
  }
  async syncStatus(update: StatusUpdate): Promise<IntegrationReceipt> {
    void update;
    return { mode: "demo", sent: false, externalId: null };
  }
}
export interface ParasutAdapter {
  readonly mode: "demo" | "live";
  salesInvoice(
    invoice: Invoice,
  ): Promise<IntegrationReceipt & { status: DocumentStatus }>;
  documentStatus(externalId: string): Promise<DocumentStatus>;
  sendElectronicInvoice(
    invoiceId: string,
    type: "EFATURA" | "EARSIV",
  ): Promise<IntegrationReceipt>;
}
export class DemoParasutAdapter implements ParasutAdapter {
  readonly mode = "demo" as const;
  async salesInvoice(
    invoice: Invoice,
  ): Promise<IntegrationReceipt & { status: DocumentStatus }> {
    void invoice;
    return { mode: "demo", externalId: null, sent: false, status: "DRAFT" };
  }
  async documentStatus(externalId: string): Promise<DocumentStatus> {
    void externalId;
    return "NOT_SENT";
  }
  async sendElectronicInvoice(): Promise<never> {
    throw new Error("Demo: gerçek e-Fatura gönderimi kapalı");
  }
}
