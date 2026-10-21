"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";
import { placeTour, type GuideStep } from "@/domain/onboarding";
import "./guided-tour.css";

type Bounds = { left: number; right: number; top: number; bottom: number };
const keyFor = (id: string) => "marketplace-os:tour:" + id;

export function GuidedTour({
  id, steps, ready = true, replay = 0,
}: {
  id: string;
  steps: readonly GuideStep[];
  ready?: boolean;
  replay?: number;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const card = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const lastReplay = useRef(0);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(keyFor(id), "done");
    } catch {
      // Dismiss even when persistent storage is unavailable.
    }
    setIndex(null);
    setBounds(null);
    previousFocus.current?.focus({ preventScroll: true });
    previousFocus.current = null;
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    let shouldOpen = false;
    if (replay > lastReplay.current) {
      lastReplay.current = replay;
      shouldOpen = true;
    } else if (lastReplay.current === 0) {
      try {
        shouldOpen = window.localStorage.getItem(keyFor(id)) !== "done";
      } catch {
        shouldOpen = true;
      }
    }
    if (!shouldOpen) return;
    const frame = requestAnimationFrame(() => setIndex(0));
    return () => cancelAnimationFrame(frame);
  }, [id, ready, replay]);

  const step = index === null ? null : steps[index];
  useEffect(() => {
    if (!step || index === null || !ready) return;
    const target = document.querySelector<HTMLElement>(step.target);
    if (!target) {
      const frame = requestAnimationFrame(() => {
        if (index === steps.length - 1) finish();
        else setIndex((current) => current === null ? null : current + 1);
      });
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = target.getBoundingClientRect();
        setBounds({
          left: Math.max(0, box.left - 6),
          right: Math.min(window.innerWidth, box.right + 6),
          top: Math.max(0, box.top - 6),
          bottom: Math.min(window.innerHeight, box.bottom + 6),
        });
        setViewport({ width: window.innerWidth, height: window.innerHeight });
      });
    };
    const initial = target.getBoundingClientRect();
    if (initial.bottom > window.innerHeight - 40 || initial.top < 40)
      target.scrollIntoView({ block: "center", behavior: "instant" });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [index, ready, step, steps.length, finish]);

  useEffect(() => {
    if (index !== null && !previousFocus.current)
      previousFocus.current = document.activeElement as HTMLElement;
  }, [index]);

  const hasBounds = bounds !== null;
  useEffect(() => {
    if (index === null || !hasBounds) return;
    const frame = requestAnimationFrame(() => {
      card.current?.querySelector<HTMLButtonElement>("[data-tour-next]")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [index, hasBounds]);

  useEffect(() => {
    if (index === null) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        finish();
      }
      if (event.key !== "Tab" || !card.current) return;
      const buttons = Array.from(card.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      if (!buttons.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!card.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keyboard, true);
    return () => document.removeEventListener("keydown", keyboard, true);
  }, [index, finish]);

  if (!step || !bounds || !ready) return null;
  const x = bounds.left, y = bounds.top;
  const width = Math.max(0, bounds.right - x), height = Math.max(0, bounds.bottom - y);
  const position = placeTour(bounds, viewport.width, viewport.height);
  const last = index === steps.length - 1;
  const advance = () => {
    if (last) finish();
    else {
      setBounds(null);
      setIndex((current) => current === null ? null : current + 1);
    }
  };
  return (
    <div className="onboarding-root" data-testid="onboarding-tour">
      <div className="onboarding-shade" style={{ left: 0, top: 0, width: "100%", height: y }} />
      <div className="onboarding-shade" style={{ left: 0, top: y, width: x, height }} />
      <div className="onboarding-shade" style={{ left: bounds.right, top: y, width: Math.max(0, viewport.width - bounds.right), height }} />
      <div className="onboarding-shade" style={{ left: 0, top: bounds.bottom, width: "100%", height: Math.max(0, viewport.height - bounds.bottom) }} />
      <div className="onboarding-highlight" aria-hidden="true" style={{ left: x, top: y, width, height }} />
      <div
        className="onboarding-pointer"
        aria-hidden="true"
        style={{
          left: Math.min(Math.max(16, x + Math.min(width / 2, 28)), Math.max(16, viewport.width - 30)),
          top: position.placement === "below" ? bounds.bottom + 2 : bounds.top - 30,
        }}
      >
        {position.placement === "below" ? <ArrowUp size={24} /> : <ArrowDown size={24} />}
      </div>
      <div className="onboarding-card" ref={card} role="dialog" aria-label="Kısa kullanım rehberi" aria-describedby="tour-description" style={{ left: position.left, top: position.top }}>
        <div className="onboarding-head">
          <span>{index + 1} / {steps.length}</span>
          <button type="button" onClick={finish} aria-label="Rehberi kapat"><X size={16} /></button>
        </div>
        <h2>{step.title}</h2>
        <p id="tour-description">{step.description}</p>
        <div className="onboarding-actions">
          <button type="button" onClick={finish}>Geç</button>
          <div>
            {index > 0 && <button type="button" onClick={() => { setBounds(null); setIndex((current) => current === null ? null : current - 1); }}><ArrowLeft size={15} /> Geri</button>}
            <button type="button" data-tour-next className="onboarding-next" onClick={advance}>
              {last ? "Bitir" : "İleri"} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
