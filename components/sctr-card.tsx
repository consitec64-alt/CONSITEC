"use client";
import InstructorDocumentsLink from '@/components/instructor-documents-link';
import { type FormEvent, useState } from 'react';
import { type Meta } from '@/lib/ui-types';
import { sctrDateLabel, sctrMonthPeriod, sctrStatusLabels, type SctrSnapshot } from '@/lib/sctr';

type Props = { readOnly?: boolean; instructors: Meta[]; state: SctrSnapshot | null; error: string; onDone: () => Promise<void>; announce: (text: string, error?: boolean) => void };
export default function SctrCard({ readOnly = false, instructors, state, error, onDone, announce }: Props) {
  const eligible = instructors.filter(i => i.sctr);
  return <section className="panel sctr-card"><div className="section-heading"><div><h2>SCTR mensual</h2><p>Una póliza y una vigencia compartidas para todos los instructores incluidos.</p></div><span className="count-badge">{eligible.length}</span></div>
    <InstructorDocumentsLink />
    {error && <p className="error-banner" role="alert">{error}</p>}
    {!state && !error && <p role="status">Consultando vigencia SCTR…</p>}
    {state && <><div className="split"><strong>Póliza compartida</strong><span className={`count-badge sctr-status-${state.status.toLowerCase()}`}>{sctrStatusLabels[state.status]}</span></div><PolicyForm key={`${state.policy?.sctrStartsAt}:${state.policy?.sctrEndsAt}`} readOnly={readOnly} state={state} onDone={onDone} announce={announce} />{state.remindOn && <p className="form-note">Recordatorio desde el {sctrDateLabel(state.remindOn)}, siete días antes de vencer. La cobertura incluye el día indicado en Hasta.</p>}</>}
    <h3>Instructores incluidos</h3><p className="form-note">Al guardar SCTR: Sí en una ficha, el instructor se incorpora a esta lista. La cobertura depende de la vigencia de la póliza.</p>
    <ul className="sctr-list" tabIndex={0} aria-label="Instructores del SCTR compartido">{eligible.map(i => <li className="sctr-entry" key={i.id}><strong>{i.name}</strong><span>{state ? sctrStatusLabels[state.status] : 'Sin consultar'}</span></li>)}</ul>
    {!eligible.length && <p className="form-note">Marca SCTR como Sí en la ficha de un instructor para incluirlo.</p>}
  </section>;
}
function PolicyForm({ readOnly, state, onDone, announce }: Omit<Props, 'instructors' | 'error'> & { state: SctrSnapshot }) {
  const [dates, setDates] = useState(() => state.policy ? { sctrStartsAt: state.policy.sctrStartsAt.slice(0, 10), sctrEndsAt: state.policy.sctrEndsAt.slice(0, 10) } : sctrMonthPeriod(state.today));
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (readOnly || busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/sctr', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dates) });
      if (response.status === 401) { window.location.assign('/login'); return; }
      const data = await response.json(); if (!response.ok) throw Error(data.error || 'No se pudo guardar el SCTR');
      await onDone(); announce('Vigencia SCTR guardada para todos los instructores incluidos.');
    } catch (error) { announce(error instanceof Error ? error.message : 'No se pudo guardar el SCTR', true); }
    finally { setBusy(false); }
  }
  return <form className="form-grid sctr-policy-form" onSubmit={event => void save(event)}><label>Desde<input disabled={readOnly || busy} name="sctrStartsAt" type="date" value={dates.sctrStartsAt} required onChange={event => setDates(previous => ({ ...previous, sctrStartsAt: event.target.value }))} /></label><label>Hasta<input disabled={readOnly || busy} name="sctrEndsAt" type="date" min={dates.sctrStartsAt} value={dates.sctrEndsAt} required onChange={event => setDates(previous => ({ ...previous, sctrEndsAt: event.target.value }))} /></label>
    <div className="sctr-policy-actions full-width"><button type="button" className="text-button" disabled={readOnly || busy || !dates.sctrEndsAt} onClick={() => setDates(sctrMonthPeriod(dates.sctrEndsAt, true))}>Preparar próximo mes</button><button className="btn secondary" disabled={readOnly || busy}>{busy ? 'Guardando…' : 'Guardar vigencia compartida'}</button></div>
  </form>;
}
