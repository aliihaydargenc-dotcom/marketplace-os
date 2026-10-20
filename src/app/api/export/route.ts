import { actor } from "@/server/auth";
import { authorize } from "@/domain/permissions";
import { snapshot } from "@/server/snapshot";
import { database } from "@/server/db";
import { lineContributions } from "@/domain/finance/allocation";
import { reportData } from "@/server/reports";
import { errorResponse } from "@/server/http";
import { z } from "zod";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
export const dynamic = "force-dynamic";
const ascii = (s: string) =>
  s.replace(
    /[ğĞıİşŞçÇöÖüÜ]/g,
    (c) =>
      ({
        ğ: "g",
        Ğ: "G",
        ı: "i",
        İ: "I",
        ş: "s",
        Ş: "S",
        ç: "c",
        Ç: "C",
        ö: "o",
        Ö: "O",
        ü: "u",
        Ü: "U",
      })[c] ?? c,
  );
export async function GET(request: Request) {
  try {
    const a = await actor();
    authorize(a.role, "REPORT");
    const url = new URL(request.url);
    const q = z
      .object({
        format: z.enum(["xlsx", "pdf"]),
        currency: z.enum(["RUB", "TRY"]),
        from: z.iso.date(),
        to: z.iso.date(),
      })
      .parse(Object.fromEntries(url.searchParams));
    const s = await database().transaction((tx) => snapshot(a, tx), {
        isolationLevel: "repeatable read",
        accessMode: "read only",
      }),
      r = reportData(s, q.currency, q.from, q.to);
    const headers = {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="marketplace-report.${q.format}"`,
    };
    if (q.format === "xlsx") {
      const book = new ExcelJS.Workbook();
      book.creator = "Marketplace OS";
      const sheet = book.addWorksheet("Sipariş mutabakatı");
      sheet.columns = [
        { header: "Sipariş", key: "number", width: 24 },
        { header: "Durum", key: "status", width: 22 },
        { header: "Para birimi", key: "currency", width: 15 },
        { header: "Brüt", key: "gross", width: 16 },
        { header: "İade", key: "refund", width: 16 },
        { header: "Net", key: "net", width: 16 },
        { header: "Komisyon", key: "commission", width: 16 },
        { header: "Lojistik", key: "logistics", width: 16 },
        { header: "Maliyet", key: "cost", width: 16 },
        { header: "Katkı kârı", key: "contribution", width: 18 },
        { header: "Maliyet eksik", key: "incomplete", width: 16 },
        { header: "Kur TRY/RUB", key: "rate", width: 18 },
        { header: "Kur tarihi", key: "date", width: 18 },
      ];
      const { profitability } = await import("@/domain/finance/calculations");
      r.orders.forEach((o) => {
        const f = profitability(o, r.entries);
        sheet.addRow({
          number: o.number,
          status: o.status,
          currency: o.currency,
          gross: f.gross / 100,
          refund: f.refunds / 100,
          net: f.net / 100,
          commission: f.commission / 100,
          logistics: f.logistics / 100,
          cost: f.complete ? f.cost / 100 : null,
          contribution: f.contribution === null ? null : f.contribution / 100,
          incomplete: f.complete ? "Hayır" : "Evet",
          rate: o.fx_rate / 1000000,
          date: String(o.fx_date).slice(0, 10),
        });
      });
      sheet.autoFilter = { from: "A1", to: "M1" };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF14263E" },
      };
      const summary = book.addWorksheet("Özet");
      summary.addRows([
        ["DEMO / TASLAK"],
        ["Dönem", q.from, q.to],
        ["Para birimi", q.currency],
        ...Object.entries(r.summary).map(([k, v]) => [k, v / 100]),
        ["Eksik maliyetli sipariş", r.incomplete],
        [
          "Uyarı",
          "Katkı kârı eksik maliyet varsa kesin sonuç değildir. Resmi muhasebe raporu değildir.",
        ],
      ]);
      const ledger = book.addWorksheet("Finans hareketleri");
      ledger.addRow(["İşlem ID", "Sipariş ID", "Tür", "Tutar", "Para birimi"]);
      r.entries.forEach((e) =>
        ledger.addRow([e.id, e.order_id, e.kind, e.amount / 100, e.currency]),
      );
      const productSheet = book.addWorksheet("Ürün katkısı");
      productSheet.addRow([
        "SKU",
        "Ürün",
        "Net satış",
        "Ürün maliyeti",
        "Katkı kârı",
        "Para birimi",
      ]);
      const allocated = r.orders.flatMap((o) =>
        lineContributions(o, r.entries),
      );
      s.products.forEach((p) => {
        const lines = allocated.filter((l) => l.productId === p.id);
        if (!lines.length) return;
        const complete = lines.every((l) => l.contribution !== null);
        productSheet.addRow([
          p.sku,
          p.name,
          lines.reduce((n, l) => n + l.net, 0) / 100,
          complete ? lines.reduce((n, l) => n + l.cost!, 0) / 100 : null,
          complete
            ? lines.reduce((n, l) => n + l.contribution!, 0) / 100
            : null,
          q.currency,
        ]);
      });
      return new Response(new Uint8Array(await book.xlsx.writeBuffer()), {
        headers: {
          ...headers,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }
    const pdf = await PDFDocument.create(),
      font = await pdf.embedFont(StandardFonts.Helvetica);
    let page = pdf.addPage([842, 595]),
      y = 550;
    const line = (text: string, size = 10) => {
      if (y < 35) {
        page = pdf.addPage([842, 595]);
        y = 550;
      }
      page.drawText(ascii(text), {
        x: 35,
        y,
        size,
        font,
        color: rgb(0.08, 0.15, 0.24),
      });
      y -= size + 10;
    };
    line("MARKETPLACE OS - DEMO / TASLAK", 18);
    line(`Siparis kohortu: ${q.from} / ${q.to} - ${q.currency}`);
    Object.entries(r.summary).forEach(([k, v]) =>
      line(`${k}: ${(v / 100).toFixed(2)} ${q.currency}`),
    );
    line(
      `Eksik maliyetli siparis: ${r.incomplete}. Katki kari eksik maliyette kesin sonuc degildir.`,
    );
    line("Resmi muhasebe belgesi degildir.");
    r.orders.forEach((o) =>
      line(
        `${o.number} | ${o.status} | ${(o.total / 100).toFixed(2)} ${o.currency}`,
      ),
    );
    return new Response(new Uint8Array(await pdf.save()), {
      headers: { ...headers, "Content-Type": "application/pdf" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
