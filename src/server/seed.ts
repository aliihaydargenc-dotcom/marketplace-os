import { importOzonDemo } from "./catalog";
import { sql, rows, type Tx } from "./db";
import { randomUUID } from "node:crypto";
const names = [
  "Seramik kupa",
  "Çelik termos",
  "Masa düzenleyici",
  "Pamuklu havlu",
  "Saklama kabı",
  "Defter seti",
  "Telefon standı",
  "Kanvas çanta",
  "Ahşap servis",
  "Cam sürahi",
  "Seyahat çantası",
  "Mutfak önlüğü",
  "Silikon spatula",
  "Masa lambası",
  "Kablo düzenleyici",
  "Baharat seti",
  "Laptop kılıfı",
  "Banyo paspası",
  "Yastık kılıfı",
  "Spor matarası",
  "Çekmece kutusu",
  "Kahve filtresi",
  "Kitap ayracı",
  "Deri kartlık",
];
export async function seed(tx: Tx, w: string, anchor = new Date()) {
  await tx.execute(
    sql`INSERT INTO stores VALUES (${w}::uuid,'ozon-demo','Ozon Global • Demo Mağaza')`,
  );
  await tx.execute(
    sql`INSERT INTO warehouses VALUES (${w}::uuid,'MAIN','Ana depo','SELLABLE'),(${w}::uuid,'QUARANTINE','İade kontrol','QUARANTINE'),(${w}::uuid,'FBO','Ozon FBO (referans)','FBO_REFERENCE')`,
  );
  const products = Array.from({ length: 72 }, (_, i) => ({
    id: `p${i + 1}`,
    sku: `MOS-${String(i + 1).padStart(4, "0")}`,
    name: names[i % 24],
    variant: ["Lacivert", "Beyaz", "Antrasit"][Math.floor(i / 24)],
    barcode: `8690100${String(i + 1).padStart(6, "0")}`,
    category: ["Ev & Yaşam", "Ofis", "Aksesuar"][i % 3],
    cost_try: i % 17 === 0 ? null : 5000 + (i % 12) * 1250,
    price_rub: 100000 + (i % 12) * 17500,
    threshold: 12,
  }));
  await tx.execute(
    sql`INSERT INTO products(workspace_id,id,sku,name,variant,barcode,category,cost_try,price_rub,threshold) SELECT ${w}::uuid,x.* FROM jsonb_to_recordset(${JSON.stringify(products)}::jsonb) AS x(id text,sku text,name text,variant text,barcode text,category text,cost_try integer,price_rub integer,threshold integer)`,
  );
  const orders: Record<string, unknown>[] = [],
    lines: Record<string, unknown>[] = [],
    ledgers: Record<string, unknown>[] = [],
    reservations: Record<string, unknown>[] = [],
    shipments: Record<string, unknown>[] = [],
    invoices: Record<string, unknown>[] = [],
    financial: Record<string, unknown>[] = [],
    returns: Record<string, unknown>[] = [],
    audit: Record<string, unknown>[] = [];
  products.forEach((p, i) =>
    ledgers.push({
      id: randomUUID(),
      product_id: p.id,
      warehouse_id: "MAIN",
      quantity: i % 13 === 0 ? 10 : 160,
      kind: "OPENING",
      reference: `OPEN-${p.id}`,
      reason: "Demo açılış bakiyesi",
      actor: "seed",
      created_at: new Date(anchor.getTime() - 40 * 86400000).toISOString(),
    }),
  );
  const states = [
    "NEW",
    "RESERVED",
    "PACKING",
    "READY",
    "SHIPPED",
    "SHIPPED",
    "SHIPPED",
    "CANCELLED",
    "RETURN_PENDING",
    "RETURNED",
  ];
  for (let i = 0; i < 260; i++) {
    const id = `o${i + 1}`,
      date = new Date(
        anchor.getTime() - (i % 30) * 86400000 - (i % 12) * 3600000,
      ).toISOString();
    const fbo = i % 31 === 0,
      status = fbo ? "NEW" : states[(i * 7 + Math.floor(i / 10)) % 10],
      shipped = ["SHIPPED", "RETURN_PENDING", "RETURNED"].includes(status);
    const currency = i % 9 === 0 ? "TRY" : "RUB",
      fx_rate = 480000 + (i % 7) * 1000;
    const ol = Array.from({ length: 1 + (i % 3) }, (_, j) => {
      const p = products[(i * 3 + j) % products.length];
      return {
        order_id: id,
        product_id: p.id,
        quantity: 1 + ((i + j) % 2),
        packed: ["READY", "SHIPPED", "RETURN_PENDING", "RETURNED"].includes(
          status,
        )
          ? 1 + ((i + j) % 2)
          : 0,
        unit_price:
          currency === "RUB"
            ? p.price_rub
            : Math.round((p.price_rub * fx_rate) / 1000000),
        unit_cost_try: p.cost_try,
      };
    });
    const total = ol.reduce((s, l) => s + l.quantity * l.unit_price, 0),
      logistics = currency === "RUB" ? 25000 : 12000;
    orders.push({
      id,
      store_id: "ozon-demo",
      number: `DEMO-${String(260 - i).padStart(6, "0")}`,
      customer: `Kurgusal alıcı ${String(i + 1).padStart(3, "0")}`,
      fulfillment: fbo ? "FBO" : "FBS",
      status,
      currency,
      created_at: date,
      shipped_at: shipped ? date : null,
      fx_date: date.slice(0, 10),
      fx_rate,
      commission_bps: 1500,
      logistics,
    });
    lines.push(...ol);
    audit.push({
      id: randomUUID(),
      reference: id,
      action: "CREATE_ORDER",
      actor: "seed",
      details: { source: "Deterministik demo" },
      created_at: date,
    });
    if (["RESERVED", "PACKING", "READY"].includes(status))
      ol.forEach((l) =>
        reservations.push({
          order_id: id,
          product_id: l.product_id,
          warehouse_id: "MAIN",
          quantity: l.quantity,
          active: true,
        }),
      );
    if (shipped) {
      shipments.push({
        order_id: id,
        tracking: `DEMO-TRK-${i + 1}`,
        created_at: date,
      });
      audit.push({
        id: randomUUID(),
        reference: id,
        action: "SHIP",
        actor: "seed",
        details: { tracking: `DEMO-TRK-${i + 1}` },
        created_at: date,
      });
      ol.forEach((l) =>
        ledgers.push({
          id: randomUUID(),
          product_id: l.product_id,
          warehouse_id: "MAIN",
          quantity: -l.quantity,
          kind: "SHIPMENT",
          reference: id,
          reason: "FBS demo sevkiyat",
          actor: "seed",
          created_at: date,
        }),
      );
      for (const [kind, amount] of [
        ["SALE", total],
        ["COMMISSION", -Math.round(total * 0.15)],
        ["LOGISTICS", -logistics],
      ] as const)
        financial.push({
          id: randomUUID(),
          order_id: id,
          kind,
          amount,
          currency,
          created_at: date,
        });
      if (ol.every((l) => l.unit_cost_try !== null)) {
        const cost = ol.reduce(
          (s, l) =>
            s +
            l.quantity *
              (currency === "TRY"
                ? l.unit_cost_try!
                : Math.round((l.unit_cost_try! * 1000000) / fx_rate)),
          0,
        );
        financial.push({
          id: randomUUID(),
          order_id: id,
          kind: "COGS",
          amount: -cost,
          currency,
          created_at: date,
        });
        if (status === "RETURNED")
          financial.push({
            id: randomUUID(),
            order_id: id,
            kind: "COGS_REVERSAL",
            amount: cost,
            currency,
            created_at: date,
          });
      }
      if (i % 3 !== 0)
        invoices.push({
          order_id: id,
          id: `inv-${i + 1}`,
          status: ["RETURN_PENDING", "RETURNED"].includes(status)
            ? "CANCELLED"
            : "DRAFT",
          label: "DEMO / TASLAK",
          created_at: date,
        });
    }
    if (["RETURN_PENDING", "RETURNED"].includes(status)) {
      returns.push({
        order_id: id,
        status: status === "RETURNED" ? "ACCEPTED" : "PENDING",
        reason: "Demo: müşteri iadesi",
        created_at: date,
        reviewed_at: status === "RETURNED" ? date : null,
      });
      financial.push({
        id: randomUUID(),
        order_id: id,
        kind: "REFUND",
        amount: -total,
        currency,
        created_at: date,
      });
      ol.forEach((l) => {
        ledgers.push({
          id: randomUUID(),
          product_id: l.product_id,
          warehouse_id: "QUARANTINE",
          quantity: l.quantity,
          kind: "RETURN_RECEIPT",
          reference: id,
          reason: "İade kalite kontrol bekliyor",
          actor: "seed",
          created_at: date,
        });
        if (status === "RETURNED") {
          ledgers.push(
            {
              id: randomUUID(),
              product_id: l.product_id,
              warehouse_id: "QUARANTINE",
              quantity: -l.quantity,
              kind: "QC_RELEASE",
              reference: id,
              reason: "Kalite kontrol onayı",
              actor: "seed",
              created_at: date,
            },
            {
              id: randomUUID(),
              product_id: l.product_id,
              warehouse_id: "MAIN",
              quantity: l.quantity,
              kind: "QC_RELEASE",
              reference: id,
              reason: "Kalite kontrol onayı",
              actor: "seed",
              created_at: date,
            },
          );
        }
      });
    }
  }
  // Keep opening balances consistent with seeded shipments and active reservations.
  products.forEach((p, i) => {
    if (i % 13 === 0) {
      const opening = ledgers.find((l) => l.reference === `OPEN-${p.id}`)!;
      const delta = ledgers
        .filter(
          (l) =>
            l.product_id === p.id &&
            l.warehouse_id === "MAIN" &&
            l.kind !== "OPENING",
        )
        .reduce((s, l) => s + Number(l.quantity), 0);
      const reserved = reservations
        .filter((r) => r.product_id === p.id)
        .reduce((s, r) => s + Number(r.quantity), 0);
      opening.quantity = reserved - delta + 5;
    }
  });
  const data: [string, Record<string, unknown>[], string][] = [
    [
      "orders",
      orders,
      "id text,store_id text,number text,customer text,fulfillment text,status text,currency text,created_at timestamptz,shipped_at timestamptz,fx_date date,fx_rate integer,commission_bps integer,logistics integer",
    ],
    [
      "order_lines",
      lines,
      "order_id text,product_id text,quantity integer,packed integer,unit_price integer,unit_cost_try integer",
    ],
    [
      "stock_ledger",
      ledgers,
      "id text,product_id text,warehouse_id text,quantity integer,kind text,reference text,reason text,actor text,created_at timestamptz",
    ],
    [
      "reservations",
      reservations,
      "order_id text,product_id text,warehouse_id text,quantity integer,active boolean",
    ],
    [
      "shipments",
      shipments,
      "order_id text,tracking text,created_at timestamptz",
    ],
    [
      "invoices",
      invoices,
      "order_id text,id text,status text,label text,created_at timestamptz",
    ],
    [
      "financial_entries",
      financial,
      "order_id text,id text,kind text,amount integer,currency text,created_at timestamptz",
    ],
    [
      "returns",
      returns,
      "order_id text,status text,reason text,created_at timestamptz,reviewed_at timestamptz",
    ],
    [
      "audit_events",
      audit,
      "id text,reference text,action text,actor text,details jsonb,created_at timestamptz",
    ],
  ];
  for (const [table, records, def] of data) {
    if (!records.length) continue;
    const columns = def
      .split(",")
      .map((c) => c.trim().split(" ")[0])
      .join(",");
    await tx.execute(
      sql`INSERT INTO ${sql.identifier(table)} (workspace_id,${sql.raw(columns)}) SELECT ${w}::uuid,x.* FROM jsonb_to_recordset(${JSON.stringify(records)}::jsonb) AS x(${sql.raw(def)})`,
    );
  }
  await importOzonDemo(tx, { workspaceId: w, userId: "admin", role: "ADMIN" });
  await rows(tx, sql`SELECT id FROM workspaces WHERE id=${w}::uuid`);
}
