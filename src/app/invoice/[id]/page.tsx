import { actor } from "@/server/auth";
import { authorize } from "@/domain/permissions";
import { snapshot } from "@/server/snapshot";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
export const dynamic = "force-dynamic";
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const a = await actor();
  authorize(a.role, "INVOICE");
  const s = await snapshot(a),
    { id } = await params;
  const invoice = s.invoices.find((i) => i.id === id);
  if (!invoice) notFound();
  const order = s.orders.find((o) => o.id === invoice.order_id)!;
  const money = (n: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: order.currency,
    }).format(n / 100);
  return (
    <main className="invoice-paper">
      <PrintButton />
      <div className="watermark">DEMO / TASLAK</div>
      <header>
        <strong>MARKETPLACE OS</strong>
        <span>Satış faturası taslağı</span>
      </header>
      <h1>DEMO / TASLAK</h1>
      <p>
        Bu belge e-Fatura veya e-Arşiv Fatura değildir. Mali geçerliliği yoktur.
      </p>
      <hr />
      <dl>
        <dt>Belge</dt>
        <dd>{invoice.id}</dd>
        <dt>Sipariş</dt>
        <dd>{order.number}</dd>
        <dt>Alıcı</dt>
        <dd>{order.customer} (kurgusal)</dd>
        <dt>Durum</dt>
        <dd>{invoice.status}</dd>
        <dt>Tarih</dt>
        <dd>{new Date(invoice.created_at).toLocaleDateString("tr-TR")}</dd>
      </dl>
      <table>
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Miktar</th>
            <th>Birim fiyat</th>
            <th>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l) => (
            <tr key={l.product_id}>
              <td>{s.products.find((p) => p.id === l.product_id)?.name}</td>
              <td>{l.quantity}</td>
              <td>{money(l.unit_price)}</td>
              <td>{money(l.quantity * l.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Toplam: {money(order.total)}</h2>
      <p>
        Vergi ve istisna uygulamaları doğrulanmamıştır. Tutar demo sipariş
        bedelidir; vergi hesaplanmamıştır.
      </p>
      <p>Paraşüt: bağlı değil · Gerçek belge gönderimi yapılmadı.</p>
    </main>
  );
}
