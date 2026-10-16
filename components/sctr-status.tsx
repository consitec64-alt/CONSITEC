"use client";
import { useCallback, useEffect, useState } from 'react';
import { sctrDateLabel, type SctrSnapshot } from '@/lib/sctr';

export function useSctrPolicy(enabled: boolean, refreshKey: unknown) {
  const [state, setState] = useState<SctrSnapshot | null>(null), [error, setError] = useState('');
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/sctr', { signal, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'No se pudo consultar la vigencia SCTR');
    if (!signal?.aborted) { setState(data); setError(''); }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const run = () => void refresh(controller.signal).catch(e => { if (!controller.signal.aborted) { setState(null); setError(e.message); } });
    run();
    const timer = setInterval(run, 60000);
    window.addEventListener('focus', run);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', run); };
  }, [enabled, refresh, refreshKey]);
  return { state, error, refresh };
}
export function SctrReminder({ state, onReview }: { state: SctrSnapshot | null; onReview: () => void }) {
  if (!state?.policy || !state.instructorCount || state.daysLeft === null || state.daysLeft > 7) return null;
  return <aside className={`sctr-reminder ${state.status === 'EXPIRED' ? 'is-expired' : ''}`} role="status" aria-label="Recordatorio de SCTR">
    <div><strong>{state.status === 'EXPIRED' ? 'El SCTR compartido está vencido' : state.daysLeft === 0 ? 'El SCTR compartido vence hoy' : `El SCTR compartido vence en ${state.daysLeft} ${state.daysLeft === 1 ? 'día' : 'días'}`}</strong><p>Vigencia hasta el {sctrDateLabel(state.policy.sctrEndsAt)} · {state.instructorCount} {state.instructorCount === 1 ? 'instructor incluido' : 'instructores incluidos'}. Renueva la póliza para mantener la cobertura.</p></div>
    <button type="button" className="btn secondary" onClick={onReview}>Revisar SCTR</button>
  </aside>;
}
