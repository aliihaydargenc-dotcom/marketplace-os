"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import type { Role } from "@/domain/types";
import { roleLabels } from "@/domain/types";
import {
  canOpenSection,
  defaultSection,
  resolveSection,
  workspaceSections,
  type WorkspaceSection,
} from "@/domain/navigation";
import "./demo-center.css";
import "./demo-entry.css";

export function DemoCenter({
  activeRole,
  returnTo,
  sessionError = false,
}: {
  activeRole: Role | null;
  returnTo?: string;
  sessionError?: boolean;
}) {
  const [role, setRole] = useState<Role>(activeRole ?? "ADMIN");
  const [section, setSection] = useState<WorkspaceSection>(() =>
    resolveSection(returnTo, activeRole ?? "ADMIN"),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const launchRef = useRef<HTMLElement>(null);
  const resumeSection = resolveSection(returnTo, activeRole ?? "ADMIN");

  async function enter() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Çalışma alanı açılamadı");
      // A document navigation also clears any cached payload from the previous demo role.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Role rotation must discard cached privileged client state.
      window.location.assign(`/workspace?section=${section}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Bağlantı kurulamadı. Tekrar deneyin.",
      );
      setPending(false);
      inFlight.current = false;
    }
  }

  return (
    <div className="demo-center ledger-entry">
      <a className="dc-skip" href="#demo-main">
        İçeriğe geç
      </a>
      <header className="entry-header">
        <Link className="entry-brand" href="/">
          marketplace<strong>OS</strong>
        </Link>
        <span>DEMO</span>
      </header>
      <main id="demo-main" className="entry-main">
        <section className="entry-launch" id="demo-launch" ref={launchRef}>
          <p className="entry-eyebrow">PAZAR TİCARET</p>
          <h1>Çalışma alanını açın</h1>
          <p className="entry-description">
            Sipariş, depo ve finans. Tek çalışma alanında.
          </p>
          {activeRole && (
            <div className="entry-session">
              <Check size={16} />
              <span>Demo oturumunuz açık · {roleLabels[activeRole]}</span>
            </div>
          )}
          {(error || sessionError) && (
            <p className="alert error" role="alert">
              {error || "Oturum bilgisi alınamadı. Tekrar deneyin."}
            </p>
          )}
          <label>
            Demo rolü
            <select
              aria-label="Demo rolü"
              value={role}
              disabled={pending}
              onChange={(e) => {
                const next = e.target.value as Role;
                setRole(next);
                setSection(defaultSection(next));
              }}
            >
              <option value="ADMIN">Yönetici</option>
              <option value="WAREHOUSE">Depo personeli</option>
              <option value="ACCOUNTANT">Muhasebe</option>
            </select>
          </label>
          <label>
            Başlangıç ekranı
            <select
              aria-label="Başlangıç ekranı"
              value={section}
              disabled={pending}
              onChange={(e) => setSection(e.target.value as WorkspaceSection)}
            >
              {Object.entries(workspaceSections)
                .filter(([id]) => canOpenSection(role, id as WorkspaceSection))
                .map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="primary entry-submit"
            disabled={pending}
            onClick={() => void enter()}
          >
            {pending
              ? "Açılıyor…"
              : activeRole
                ? "Bu rolle çalışma ekranını aç"
                : "Çalışma ekranını aç"}
            <ArrowRight size={18} />
          </button>
          {activeRole && (
            <Link
              className="entry-resume"
              href={`/workspace?section=${resumeSection}`}
            >
              Mevcut oturuma devam et
              <ArrowUpRight size={16} />
            </Link>
          )}
          <details className="entry-note">
            <summary>Demo hakkında</summary>
            <p>
              Rol seçimi demo incelemesi içindir; gerçek kullanıcı girişi
              değildir. Ozon ve Paraşüt bağlı değil. Belgeler DEMO / TASLAK
              niteliğindedir. Mevcut oturumda rol değiştirmek kayıtları
              sıfırlamaz.
            </p>
          </details>
        </section>
      </main>
    </div>
  );
}
