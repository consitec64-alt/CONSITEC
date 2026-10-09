"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { tutorialSteps, type TutorialStep } from "@/lib/tutorial-steps";

type Tour = { active: TutorialStep | null; start: () => void };
const Context = createContext<Tour>({ active: null, start: () => {} });
export const useTutorial = () => useContext(Context);
export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter(), pathname = usePathname();
  const [isAdmin, setAdmin] = useState(false), [index, setIndex] = useState<number | null>(null);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const items = useMemo(() => tutorialSteps(isAdmin), [isAdmin]);
  const active = index === null ? null : items[index];
  const start = useCallback(() => { if (ready) { setError(""); setIndex(0); } }, [ready]);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me").then(async res => { if (!res.ok) return; const user = await res.json(); if (cancelled) return;
      setAdmin(user.role === "ADMIN"); setReady(true);
      if (!user.tutorialCompleted) setIndex(Math.min(user.tutorialStep, tutorialSteps(user.role === "ADMIN").length - 1));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (!active) return; const path = active.tab === "users" ? "/dashboard/users" : "/dashboard"; if (pathname !== path) router.replace(path, { scroll: false }); }, [active, pathname, router]);
  async function save(next: number, completed = false) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/tutorial", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: next, completed }) });
      if (!res.ok) throw new Error("No se pudo guardar el progreso. Inténtalo nuevamente.");
      if (completed) setIndex(null); else setIndex(next);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <Context.Provider value={{ active: active ?? null, start }}>{children}{active?.confirmation && <div className="modal-overlay"><div className="dialog tour-delete-preview" role="region" aria-label="Ejemplo de confirmación"><div className="section-heading"><h2>Enviar a papelera</h2></div><p>Se eliminará {active.tab === "users" ? "la cuenta seleccionada y perderá su acceso. Sus registros comerciales se conservan." : "el registro seleccionado de la vista activa. Podrás recuperarlo en Papelera durante siete días."}</p><p className="form-note">Ejemplo del tutorial · no se eliminarán datos.</p><div className="dialog-actions"><button className="btn secondary" type="button" disabled>Cancelar</button><button className="btn destructive" type="button" disabled>Eliminar</button></div></div></div>}{active?.preview === "duplicate" && <div className="modal-overlay"><div className="dialog tour-duplicate-preview"><h2>Posible duplicado</h2><p>Ejemplo: mismo cliente, curso y fecha. Revisa la coincidencia antes de guardar.</p><div className="dialog-actions"><button className="btn secondary" disabled>Volver y revisar</button><button className="btn" disabled>Guardar de todos modos</button></div></div></div>}{active && index !== null && <TourOverlay step={active} index={index} count={items.length} busy={busy} error={error} onMove={save} />}</Context.Provider>;
}
function TourOverlay({ step, index, count, busy, error, onMove }: { step: TutorialStep; index: number; count: number; busy: boolean; error: string; onMove: (index: number, complete?: boolean) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null), card = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number }>({ bottom: 16, left: 16 });
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  useEffect(() => {
    setRect(null); let target: HTMLElement | null = null, previous: HTMLElement | null = null;
    const opened = new Set<HTMLDetailsElement>();
    const find = () => {
      // Prefer selectors in their specified order, even if the fallback appears earlier in the DOM.
      target = null;
      for (const selector of step.target.match(/(?:\[[^\]]*\]|[^,])+/g) ?? []) {
        const found = document.querySelector<HTMLElement>(selector.trim());
        if (!found) continue;
        const candidate = found.closest<HTMLElement>("label") ?? found;
        for (let parent = candidate.parentElement; parent; parent = parent.parentElement) {
          if (parent instanceof HTMLDetailsElement && !parent.open) { opened.add(parent); parent.open = true; }
        }
        const bounds = candidate.getBoundingClientRect();
        if (bounds.width && bounds.height) { target = candidate; break; }
      }
      if (!target) return;
      if (target !== previous) { target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }); previous = target; }
      const b = target.getBoundingClientRect(); if (!b.width || !b.height) return;
      const height = card.current?.getBoundingClientRect().height ?? 240;
      const pad = 12, width = Math.min(480, innerWidth - 24);
      const top = b.bottom + pad + height <= innerHeight ? b.bottom + pad : b.top - height - pad >= pad ? b.top - height - pad : undefined;
      setPosition(top !== undefined ? { top, left: Math.max(pad, Math.min(b.left, innerWidth - width - pad)) } : { bottom: pad, left: Math.max(pad, innerWidth - width - pad) });
      setRect({ x: Math.max(4, b.left - 4), y: Math.max(4, b.top - 4), width: Math.max(0, Math.min(innerWidth - 4, b.right + 4) - Math.max(4, b.left - 4)), height: Math.max(0, Math.min(innerHeight - 4, b.bottom + 4) - Math.max(4, b.top - 4)) });
    };
    const timer = window.setInterval(() => { find(); }, 150);
    const update = () => find(); window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    return () => { for (const detail of opened) detail.open = false; clearInterval(timer); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [step]);
  return <dialog ref={dialog} className="tour-stage" aria-labelledby="tutorial-title" aria-describedby="tutorial-description" onCancel={e => { e.preventDefault(); if (!busy) void onMove(index, true); }}>
    {rect ? <div className="tour-spotlight" aria-hidden="true" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} /> : <div className="tour-shade" />}
    <div ref={card} className="tour-card" style={position}>
      <div className="tutorial-progress">GUÍA CONSITEC · {index + 1} DE {count}</div>
      <h2 id="tutorial-title" aria-live="polite">{step.title}</h2><p id="tutorial-description">{step.text}</p>
      {!rect && <small className="tour-empty">Este control aparecerá cuando la sección termine de cargar o tenga registros. Puedes continuar el recorrido.</small>}
      {error && <p role="alert">{error}</p>}
      <div className="tutorial-actions"><button className="btn secondary" disabled={busy} onClick={() => void onMove(index, true)}>Omitir</button><div><button className="btn secondary" disabled={busy || index === 0} onClick={() => void onMove(index - 1)}>Atrás</button><button className="btn" disabled={busy} onClick={() => void onMove(index === count - 1 ? index : index + 1, index === count - 1)}>{busy ? "Guardando…" : index === count - 1 ? "Finalizar" : "Siguiente"}</button></div></div>
    </div>
  </dialog>;
}
