"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  LayoutDashboard,
  ScanBarcode,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
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

const roleDetails = {
  ADMIN: {
    title: "Operasyonun tamamı",
    description:
      "Siparişleri, stokları ve finansal sonuçları aynı çalışma alanında inceleyin.",
    tasks: [
      "Sipariş oluşturma ve toplu işlemler",
      "Depo, fatura ve katkı analizi",
      "Mağaza ve kullanıcı ayarları",
    ],
  },
  WAREHOUSE: {
    title: "Depo çalışma alanı",
    description: "Sipariş hazırlama, barkod doğrulama ve sevkiyata odaklanın.",
    tasks: [
      "FBS hazırlama kuyruğu",
      "Stok, sayım farkı ve iade kontrolü",
      "Finans ve alış maliyetlerine erişim yok",
    ],
  },
  ACCOUNTANT: {
    title: "Fatura ve finans",
    description:
      "Siparişe bağlı belgeleri, giderleri ve katkı hesaplarını izleyin.",
    tasks: [
      "Fatura taslağı ve belge durumları",
      "Sipariş ve ürün bazında analiz",
      "Excel ve PDF raporları",
    ],
  },
} satisfies Record<
  Role,
  { title: string; description: string; tasks: string[] }
>;

const workflow = [
  {
    section: "orders",
    icon: ShoppingBag,
    title: "Sipariş",
    detail: "Kaydı açın, ürünleri ve stok uygunluğunu kontrol edin.",
  },
  {
    section: "packing",
    icon: ScanBarcode,
    title: "Hazırlama ve sevkiyat",
    detail: "Stok ayırın, barkodla doğrulayın ve sevk edin.",
  },
  {
    section: "inventory",
    icon: Boxes,
    title: "Stok hareketleri",
    detail: "Fiziksel stok, rezervasyon ve hareket geçmişini izleyin.",
  },
  {
    section: "invoices",
    icon: FileText,
    title: "Fatura ve sonuç",
    detail: "Taslak belgeyi açın, siparişin finansal sonucuna geçin.",
  },
] as const;

export function DemoCenter({
  activeRole,
  returnTo,
  sessionError = false,
}: {
  activeRole: Role | null;
  returnTo?: string;
  sessionError?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(activeRole ?? "ADMIN");
  const [section, setSection] = useState<WorkspaceSection>(() =>
    resolveSection(returnTo, activeRole ?? "ADMIN"),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const launchRef = useRef<HTMLElement>(null);
  const details = roleDetails[role];
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
    <div className="demo-center">
      <a className="dc-skip" href="#demo-main">
        İçeriğe geç
      </a>
      <header className="dc-topbar">
        <Link
          className="dc-brand"
          href="/"
          aria-label="Marketplace OS Demo Merkezi"
        >
          <span className="dc-logomark">
            M<span />
          </span>
          <span>
            marketplace<strong>OS</strong>
          </span>
        </Link>
        <nav aria-label="Uygulama alanları">
          <span aria-current="page">Demo Merkezi</span>
          <a
            href={
              activeRole
                ? `/workspace?section=${resumeSection}`
                : "#demo-launch"
            }
          >
            Çalışma ekranı <ArrowUpRight size={14} />
          </a>
        </nav>
        <span className="dc-environment">
          <i /> Demo ortamı
        </span>
      </header>

      <main id="demo-main" className="dc-main">
        <div className="dc-page-heading">
          <div>
            <p className="dc-eyebrow">PAZAR TİCARET / OZON GLOBAL</p>
            <h1>Demo Merkezi</h1>
            <p>Bir rol seçin. Günlük operasyonu çalışma ekranında deneyin.</p>
          </div>
          <span className="dc-outline-label">
            <ShieldCheck size={15} /> Kişiye özel demo alanı
          </span>
        </div>

        <div className="dc-grid">
          <div className="dc-overview">
            <section className="dc-intro">
              <div className="dc-intro-label">
                <span>MARKETPLACE OS</span>
                <span>OPERASYON PLATFORMU</span>
              </div>
              <h2>
                Her siparişin
                <br />
                bir sonraki adımı belli.
              </h2>
              <p>
                Sipariş, depo, sevkiyat, fatura ve finans.
                <br />
                Aynı kaydın birbirine bağlı çalışma adımları.
              </p>
              <div className="dc-flow-strip">
                <span>Sipariş</span>
                <ChevronRight size={15} />
                <span>Hazırlama</span>
                <ChevronRight size={15} />
                <span>Sevkiyat</span>
                <ChevronRight size={15} />
                <span>Finans</span>
              </div>
              <div className="dc-intro-foot">
                <span>
                  <i /> Çalışan FBS akışı
                </span>
                <span>Kalıcı demo kayıtları</span>
              </div>
            </section>

            <section
              className="dc-workflow"
              aria-labelledby="dc-workflow-heading"
            >
              <div className="dc-section-heading">
                <h2 id="dc-workflow-heading">Nereden başlamak istersiniz?</h2>
                <span>04 çalışma adımı</span>
              </div>
              <div className="dc-workflow-list">
                {workflow.map((step, index) => {
                  const available = canOpenSection(role, step.section);
                  const selected = section === step.section;
                  return (
                    <button
                      key={step.section}
                      type="button"
                      aria-pressed={selected}
                      disabled={pending || !available}
                      onClick={() => {
                        setSection(step.section);
                        launchRef.current?.scrollIntoView({
                          block: "nearest",
                          behavior: "smooth",
                        });
                      }}
                    >
                      <span className="dc-step-number">0{index + 1}</span>
                      <span className="dc-step-icon">
                        <step.icon size={19} />
                      </span>
                      <span className="dc-step-copy">
                        <strong>{step.title}</strong>
                        <small>{step.detail}</small>
                      </span>
                      {available ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <span className="dc-no-access">Bu rolde kapalı</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="dc-environment-note">
              <CircleHelp size={18} />
              <div>
                <strong>Demo ve çalışma ekranı aynı kayıtları kullanır.</strong>
                <p>
                  Demo Merkezi’ne dönmek verileri sıfırlamaz. Gerçek Ozon ve
                  Paraşüt bağlantısı yoktur; belgeler DEMO / TASLAK olarak
                  oluşturulur.
                </p>
              </div>
            </section>
          </div>

          <aside
            className="dc-launch"
            id="demo-launch"
            ref={launchRef}
            aria-labelledby="dc-launch-title"
          >
            <div className="dc-launch-head">
              <span className="dc-launch-icon">
                <LayoutDashboard size={21} />
              </span>
              <span className="dc-label">ÇALIŞMA EKRANI</span>
            </div>
            <h2 id="dc-launch-title">Çalışma alanını açın</h2>
            <p>Rolünüz, kullanabileceğiniz araçları belirler.</p>
            {activeRole && (
              <div className="dc-session">
                <i />
                <div>
                  <strong>Demo oturumunuz açık</strong>
                  <small>{roleLabels[activeRole]} · Kayıtlarınız korunur</small>
                </div>
              </div>
            )}
            {sessionError && (
              <div className="dc-session-error" role="alert">
                Oturum bilgisi alınamadı.{" "}
                <button type="button" onClick={() => router.refresh()}>
                  Yeniden dene
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void enter();
              }}
            >
              <label htmlFor="demo-role">Demo rolü</label>
              <select
                id="demo-role"
                aria-label="Demo rolü"
                value={role}
                disabled={pending}
                onChange={(e) => {
                  const next = e.target.value as Role;
                  setRole(next);
                  setSection(defaultSection(next));
                }}
              >
                {Object.entries(roleLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="dc-role-description" aria-live="polite">
                <strong>{details.title}</strong>
                <p>{details.description}</p>
                <ul>
                  {details.tasks.map((task) => (
                    <li key={task}>
                      <Check size={13} />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
              <label htmlFor="demo-start">Başlangıç ekranı</label>
              <select
                id="demo-start"
                aria-label="Başlangıç ekranı"
                value={section}
                disabled={pending}
                onChange={(e) => setSection(e.target.value as WorkspaceSection)}
              >
                {Object.entries(workspaceSections)
                  .filter(([id]) =>
                    canOpenSection(role, id as WorkspaceSection),
                  )
                  .map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
              </select>
              {error && (
                <p className="dc-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="dc-primary" disabled={pending}>
                {pending
                  ? "Çalışma alanı açılıyor…"
                  : activeRole
                    ? "Bu rolle çalışma ekranını aç"
                    : "Demoya giriş yap"}
                <ArrowRight size={17} />
              </button>
              <p className="dc-create-note">
                {activeRole
                  ? "Rol değişimi aynı demo alanında yapılır."
                  : "İlk girişte size özel demo kayıtları hazırlanır."}
              </p>
            </form>
            {activeRole && (
              <Link
                className="dc-resume"
                href={`/workspace?section=${resumeSection}`}
              >
                Mevcut oturuma devam et <ArrowUpRight size={15} />
              </Link>
            )}
            <div className="dc-login-note">
              <ShieldCheck size={15} />
              <p>
                Rol seçimi demo incelemesi içindir. Gerçek kullanıcı girişi ve
                hesap yetkilendirmesi henüz eklenmedi.
              </p>
            </div>
          </aside>
        </div>
        <footer className="dc-footer">
          <span>
            Marketplace OS <b>/</b> Demo Merkezi
          </span>
          <span>Tanıtım burada. Günlük iş, çalışma ekranında.</span>
        </footer>
      </main>
    </div>
  );
}
