"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  RotateCcw,
  ScanBarcode,
  Search,
  Settings,
  ShoppingBag,
  X,
} from "lucide-react";
import { canOpenSection, type WorkspaceSection } from "@/domain/navigation";
import type { Role } from "@/domain/types";
import "./workspace-command-menu.css";

const destinations = [
  {
    id: "dashboard",
    label: "Operasyon Merkezi",
    detail: "Aksiyonlar ve günlük özet",
    icon: LayoutDashboard,
  },
  {
    id: "orders",
    label: "Siparişler",
    detail: "Arama, filtreler ve kayıt detayları",
    icon: ShoppingBag,
  },
  {
    id: "packing",
    label: "Hazırlama Masası",
    detail: "Barkod doğrulama ve sevkiyat",
    icon: ScanBarcode,
  },
  {
    id: "inventory",
    label: "Stok & Depo",
    detail: "Ürünler, stok ve hareketler",
    icon: Boxes,
  },
  {
    id: "returns",
    label: "İade & Kalite Kontrol",
    detail: "İade kuyruğu ve inceleme",
    icon: RotateCcw,
  },
  {
    id: "invoices",
    label: "Fatura Merkezi",
    detail: "Demo belge taslakları",
    icon: FileText,
  },
  {
    id: "finance",
    label: "Finans & Analitik",
    detail: "Gelir, maliyet ve raporlar",
    icon: ChartNoAxesCombined,
  },
  {
    id: "settings",
    label: "Sistem Yönetimi",
    detail: "İşletme ve demo ayarları",
    icon: Settings,
  },
] as const;

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

export function WorkspaceCommandMenu({
  role,
  active,
  onNavigate,
  onClose,
}: {
  role: Role;
  active: WorkspaceSection;
  onNavigate: (section: WorkspaceSection) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const results = useMemo(() => {
    const needle = normalize(query.trim());
    return destinations.filter(
      (item) =>
        canOpenSection(role, item.id) &&
        (!needle || normalize(`${item.label} ${item.detail}`).includes(needle)),
    );
  }, [role, query]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, []);

  function select(section: WorkspaceSection) {
    onClose();
    onNavigate(section);
  }

  return createPortal(
    <div
      className="command-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Hızlı bölüm geçişi"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlighted((index) =>
              Math.min(Math.max(0, results.length - 1), index + 1),
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlighted((index) => Math.max(0, index - 1));
          } else if (
            event.key === "Enter" &&
            results.length &&
            document.activeElement === inputRef.current
          ) {
            event.preventDefault();
            select(
              results[Math.min(results.length - 1, Math.max(0, highlighted))]
                .id,
            );
          } else if (event.key === "Tab") {
            // Only the query and close control participate in tab order.
            if (
              event.shiftKey &&
              document.activeElement === inputRef.current
            ) {
              event.preventDefault();
              closeRef.current?.focus();
            } else if (
              !event.shiftKey &&
              document.activeElement === closeRef.current
            ) {
              event.preventDefault();
              inputRef.current?.focus();
            }
          }
        }}
      >
        <div className="command-search-row">
          <Search size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="workspace-command-results"
            aria-expanded="true"
            aria-activedescendant={
              results.length
                ? `workspace-command-${results[Math.min(results.length - 1, Math.max(0, highlighted))].id}`
                : undefined
            }
            aria-label="Bölüm ara"
            placeholder="Hangi bölüme gitmek istiyorsunuz?"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlighted(0);
            }}
          />
          <button
            ref={closeRef}
            type="button"
            aria-label="Hızlı geçişi kapat"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="command-results-title">ÇALIŞMA ALANLARI</div>
        <div
          id="workspace-command-results"
          className="command-results"
          role="listbox"
          aria-label="Bölümler"
        >
          {results.map((item, index) => (
            <button
              type="button"
              tabIndex={-1}
              key={item.id}
              id={`workspace-command-${item.id}`}
              role="option"
              aria-selected={highlighted === index}
              className={`command-option${highlighted === index ? " highlighted" : ""}`}
              onMouseEnter={() => setHighlighted(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(item.id)}
            >
              <item.icon size={19} aria-hidden="true" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              {active === item.id ? (
                <em>Şu an buradasınız</em>
              ) : (
                <ArrowRight size={16} aria-hidden="true" />
              )}
            </button>
          ))}
          {!results.length && (
            <p className="command-empty">
              Bu aramayla eşleşen erişilebilir bir bölüm bulunamadı.
            </p>
          )}
        </div>
        <footer className="command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> Seç
          </span>
          <span>
            <kbd>Enter</kbd> Git
          </span>
          <span>
            <kbd>Esc</kbd> Kapat
          </span>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
