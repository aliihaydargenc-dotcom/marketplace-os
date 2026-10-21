"use client";
import { Search } from "lucide-react";
import { useRef, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import type { WorkspaceSnapshot } from "@/domain/types";
import type { Command } from "@/domain/orders/commands";
import { DataTable } from "./data-table";
export function InvoiceWorkbench({
  data,
  busy,
  run,
  reload,
  onOpen,
}: {
  data: WorkspaceSnapshot;
  busy: boolean;
  run: (c: Command, quiet?: boolean) => Promise<unknown>;
  reload: () => Promise<void>;
  onOpen: (id: string) => void;
}) {
  const [queue, setQueue] = useState("ALL"),
    [query, setQuery] = useState(""),
    [selection, setSelection] = useState<RowSelectionState>({}),
    [results, setResults] = useState<string[]>([]),
    [working, setWorking] = useState(false);
  const flight = useRef(false);
  const rows = data.orders
    .filter(
      (o) =>
        o.fulfillment === "FBS" && (o.invoice_id || o.status === "SHIPPED"),
    )
    .map((o) => {
      const i = data.invoices.find((i) => i.order_id === o.id);
      return {
        id: i?.id ?? `missing:${o.id}`,
        orderId: o.id,
        number: o.number,
        status: i?.status ?? "MISSING",
        error: i?.error ?? "",
        createdAt: i?.created_at ?? o.shipped_at ?? o.created_at,
      };
    });
  const visible = rows.filter(
    (r) =>
      (queue === "ALL" || r.status === queue) &&
      `${r.id} ${r.number} ${r.error}`
        .toLocaleLowerCase("tr-TR")
        .includes(query.toLocaleLowerCase("tr-TR")),
  );
  const candidates = visible
    .filter((r) => selection[r.id] && r.status === "MISSING")
    .slice(0, 50);
  const labels: Record<string, string> = {
    ALL: "Tümü",
    MISSING: "Belge bekleyen",
    DRAFT: "Taslak",
    ERROR: "Hata",
    CANCELLED: "İptal",
  };
  const locked = busy || working;
  async function batch() {
    if (locked || flight.current || !candidates.length) return;
    flight.current = true;
    setWorking(true);
    const output: string[] = [];
    setResults([]);
    try {
      for (const r of candidates) {
        try {
          await run({ action: "INVOICE", orderId: r.orderId }, true);
          output.push(`${r.number}: taslak hazır`);
        } catch (err) {
          output.push(
            `${r.number}: ${(err as Error).message}. Sonuç belirsizse güncel kaydı kontrol edin; kalan işlemler başlatılmadı.`,
          );
          break;
        }
        setResults([...output]);
      }
      setResults(output);
      setSelection({});
    } finally {
      await reload();
      setWorking(false);
      flight.current = false;
    }
  }
  return (
    <section className="invoice-workbench" aria-label="Fatura çalışma alanı">
      <div className="filterbar invoice-lanes">
        {Object.entries(labels).map(([id, label]) => (
          <button
            key={id}
            disabled={locked}
            aria-pressed={queue === id}
            onClick={() => {
              setQueue(id);
              setSelection({});
            }}
          >
            {label} (
            {id === "ALL"
              ? rows.length
              : rows.filter((r) => r.status === id).length}
            )
          </button>
        ))}
      </div>
      <div className="filterbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Belge, sipariş veya hata ara"
            placeholder="Belge, sipariş veya hata ara…"
            value={query}
            disabled={locked}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelection({});
            }}
          />
        </label>
        <span className="pill" title="Paraşüt bağlı değil · Dışarı gönderilmez">
          DEMO / TASLAK
        </span>
      </div>
      <div className="filterbar">
        <button
          disabled={locked || !candidates.length}
          onClick={() => void batch()}
        >
          Seçili {candidates.length} siparişe taslak oluştur
        </button>
        <small
          className="muted"
          title="Hatalı ve iptal belgeler detaydan gerekçeyle yeniden açılır"
        >
          En fazla 50 uygun sipariş
        </small>
      </div>
      {results.length > 0 && (
        <div role="status">
          {results.map((r, i) => (
            <p key={i}>{r}</p>
          ))}
        </div>
      )}
      <DataTable
        data={visible}
        disabled={locked}
        selection={selection}
        onSelection={setSelection}
        label="Fatura iş kuyruğu"
        onOpen={(r) => onOpen(r.orderId)}
        columns={
          [
            { accessorKey: "number", header: "Sipariş" },
            {
              accessorKey: "id",
              header: "Belge",
              cell: ({ row }) =>
                row.original.status === "MISSING" ? (
                  "Bekliyor"
                ) : (
                  <>
                    <b>{row.original.id.slice(0, 16)}</b>
                    <small>DEMO / TASLAK</small>
                  </>
                ),
            },
            {
              accessorKey: "status",
              header: "Durum",
              cell: ({ getValue }) => labels[getValue<string>()],
            },
            { accessorKey: "error", header: "Hata / gerekçe" },
            {
              accessorKey: "createdAt",
              header: "Tarih",
              cell: ({ getValue }) =>
                new Date(getValue<string>()).toLocaleString("tr-TR"),
            },
            {
              id: "print",
              header: "Belgeyi aç",
              cell: ({ row }) =>
                row.original.status !== "MISSING" ? (
                  <a
                    href={`/invoice/${row.original.id}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Yazdır / PDF ↗
                  </a>
                ) : (
                  "—"
                ),
            },
          ] satisfies ColumnDef<(typeof rows)[number]>[]
        }
      />
    </section>
  );
}
