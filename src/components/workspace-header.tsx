"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  Boxes,
  ChartNoAxesCombined,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  CircleHelp,
  RotateCcw,
  ScanBarcode,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { canOpenSection, type WorkspaceSection } from "@/domain/navigation";
import { roleLabels, type WorkspaceSnapshot } from "@/domain/types";

const sections = [
  { id: "orders", label: "Siparişler", icon: ShoppingBag },
  { id: "packing", label: "Hazırlama", icon: ScanBarcode },
  { id: "inventory", label: "Stok", icon: Boxes },
  { id: "returns", label: "İadeler", icon: RotateCcw },
  { id: "invoices", label: "Faturalar", icon: FileText },
  { id: "finance", label: "Finans", icon: ChartNoAxesCombined },
] as const;

export function WorkspaceHeader({
  data,
  section,
  busy,
  onNavigate,
  onRefresh,
  onLogout,
  onGuide,
}: {
  data: WorkspaceSnapshot;
  section: WorkspaceSection;
  busy: boolean;
  onNavigate: (section: WorkspaceSection) => void;
  onRefresh: () => void;
  onLogout: () => void;
  onGuide: () => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  return (
    <header className="ledger-header">
      <button
        className="ledger-brand"
        aria-label="Operasyon Merkezi"
        disabled={busy}
        onClick={() => onNavigate("dashboard")}
      >
        marketplace<strong>OS</strong>
      </button>
      <nav aria-label="Çalışma alanları" data-tour="workspace-nav">
        {sections
          .filter((item) => canOpenSection(data.actor.role, item.id))
          .map((item) => (
            <button
              key={item.id}
              disabled={busy}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
      </nav>
      <div className="ledger-header-tools">
        <details
          ref={menuRef}
          className="workspace-menu"
          data-tour="workspace-menu"
          onKeyDown={(e) => {
            if (e.key === "Escape" && menuRef.current) {
              menuRef.current.open = false;
              menuRef.current.querySelector("summary")?.focus();
            }
          }}
        >
          <summary aria-label="Çalışma alanı menüsü">
            <span>Pazar Ticaret</span>
            <ChevronDown size={14} />
          </summary>
          <div className="workspace-menu-content">
            <strong>{data.workspace.name}</strong>
            <small>{roleLabels[data.actor.role]}</small>
            <button
              disabled={busy}
              onClick={() => {
                onNavigate("dashboard");
                if (menuRef.current) menuRef.current.open = false;
              }}
            >
              <LayoutDashboard size={16} />
              Operasyon Merkezi
            </button>
            {canOpenSection(data.actor.role, "settings") && (
              <button
                disabled={busy}
                onClick={() => {
                  onNavigate("settings");
                  if (menuRef.current) menuRef.current.open = false;
                }}
              >
                <Settings size={16} />
                Sistem Yönetimi
              </button>
            )}
            <Link
              href={`/?returnTo=${section}`}
              prefetch={false}
              onClick={(e) => {
                if (busy) e.preventDefault();
              }}
            >
              Demo Merkezi
            </Link>
            <button disabled={busy} onClick={onLogout}>
              <LogOut size={16} />
              Çıkış yap
            </button>
          </div>
        </details>
        <button
          type="button"
          className="ledger-help"
          aria-label="Kısa kullanım rehberini aç"
          title="Rehberi aç"
          onClick={onGuide}
        >
          <CircleHelp size={17} />
        </button>
        <span
          className="ledger-demo"
          title="Demo verisi · Ozon ve Paraşüt bağlı değil"
        >
          DEMO
        </span>
        <button
          className="ledger-refresh"
          disabled={busy}
          onClick={onRefresh}
          aria-label="Verileri yenile"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
}
