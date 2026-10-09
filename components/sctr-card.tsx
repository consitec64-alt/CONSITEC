"use client";
import InstructorDocumentsLink from "@/components/instructor-documents-link";
import { FormEvent, useState } from 'react';
import { Meta } from '@/lib/ui-types';

export default function SctrCard({ readOnly=false, instructors, onDone, announce }: { readOnly?:boolean; instructors: Meta[]; onDone: () => Promise<void>; announce: (text: string, error?: boolean) => void }) {
  const [busy, setBusy] = useState('');
  const eligible = instructors.filter(i => i.sctr);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  async function save(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(id);
    try {
      const response = await fetch(`/api/metadata/instructors/${id}/sctr`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      if (response.status === 401) { window.location.assign('/login'); return; }
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo guardar el SCTR');
      await onDone(); announce('Vigencia SCTR guardada.');
    } catch (error) { announce(error instanceof Error ? error.message : 'No se pudo guardar el SCTR', true); }
    finally { setBusy(''); }
  }
  return <section className="panel sctr-card"><div className="section-heading"><div><h2>SCTR</h2><p>Vigencia de los instructores que tienen SCTR marcado como Sí.</p></div><span className="count-badge">{eligible.length}</span></div><InstructorDocumentsLink /><div className="sctr-list" tabIndex={0} role="region" aria-label="Vigencias SCTR de instructores">{eligible.map(i => {
    const start = i.sctrStartsAt?.slice(0, 10), end = i.sctrEndsAt?.slice(0, 10);
    const status = !start || !end ? 'Sin fechas registradas' : end < today ? 'Vencido' : start > today ? 'Por iniciar' : 'Vigente';
    return <div className="sctr-entry" key={i.id}><div className="split"><strong>{i.name}</strong><span className="count-badge">{status}</span></div><form className="form-grid" onSubmit={event => void save(event, i.id)}><label>Desde<input disabled={readOnly} name="sctrStartsAt" type="date" defaultValue={start || ''} required /></label><label>Hasta<input disabled={readOnly} name="sctrEndsAt" type="date" defaultValue={end || ''} required /></label><button className="btn secondary full-width" disabled={readOnly||!!busy}>{busy === i.id ? 'Guardando…' : 'Guardar vigencia'}</button></form></div>;
  })}{!eligible.length && <p className="form-note">Marca SCTR como Sí en la ficha de un instructor para registrar aquí sus fechas.</p>}</div></section>;
}
