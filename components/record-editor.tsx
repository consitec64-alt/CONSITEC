'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { BookOpen, Building2, CalendarDays, ChevronDown, UserRound } from 'lucide-react';
import { certificateStatusLabels, PAYMENT_WITHOUT_INVOICE } from '@/lib/certificate-status';
import { draftSessions } from '@/lib/service-draft';
import { assignedItems } from '@/lib/date-assignments';
import { modalityLabel } from '@/lib/class-modality';
import type { Meta } from '@/lib/ui-types';

type Values = { customer: string; code: string; courseIds: string[]; instructorIds: string[]; sessions: string; saleDate: string; modality: string; amount: string; status: string; commercial: string; certificateKind: string };
const empty: Values = { customer: '', code: '', courseIds: [], instructorIds: [], sessions: '', saleDate: '', modality: '', amount: '', status: '', commercial: '', certificateKind: '' };
function dateLabel(value: string) {
  if (!value) return 'Fecha pendiente';
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) : 'Fecha pendiente';
}

export default function RecordEditor({ formRef, kind, courses, instructors, commercial, children, actions }: {
  formRef: RefObject<HTMLFormElement>; kind: 'service' | 'sale'; courses: Meta[]; instructors: Meta[]; commercial: string; children: ReactNode; actions: ReactNode;
}) {
  const fields = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Values>(empty);
  useEffect(() => {
    const form = formRef.current, source = fields.current;
    if (!form || !source) return;
    let frame = 0;
    const read = () => {
      const data = new FormData(form);
      const text = (name: string) => String(data.get(name) ?? '');
      const selection = form.elements.namedItem('salespersonId') as HTMLSelectElement | null;
      const next: Values = { customer: text(kind === 'service' ? 'company' : 'customerName'), code: text('correlativeCode'), courseIds: data.getAll('courseIds').map(String), instructorIds: data.getAll('instructorIds').map(String), sessions: text('sessions'), saleDate: text('saleDate'), modality: text('modality'), amount: text('amount'), status: text('status'), commercial: selection?.selectedOptions[0]?.text || commercial, certificateKind: text('certificateKind') };
      setValues(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    // Read after React updates controlled/hidden fields, including chip removal and clocks.
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read); };
    read();
    const events = ['input', 'change', 'click', 'reset'];
    events.forEach(event => form.addEventListener(event, schedule, true));
    const observer = new MutationObserver(schedule);
    observer.observe(source, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'checked', 'selected', 'disabled'] });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); events.forEach(event => form.removeEventListener(event, schedule, true)); };
  }, [formRef, kind, commercial]);
  const sessions = draftSessions(values.sessions) ?? [];
  const courseNames = values.courseIds.map(id => courses.find(course => course.id === id)?.name).filter(Boolean);
  const instructorNames = values.instructorIds.map(id => instructors.find(instructor => instructor.id === id)?.name).filter(Boolean);
  const amount = Number(values.amount);
  const status = (kind === 'sale' ? certificateStatusLabels[values.status] : { SCHEDULED: 'Programado', EXECUTED: 'Ejecutado', INVOICED: 'Facturado' }[values.status]) || 'Por definir';
  return <div className="record-editor">
    <div className="record-editor-content">
      <div className="record-editor-fields" ref={fields}>{children}</div>
      <aside className="record-editor-summary" aria-label="Resumen del registro">
        <details className="record-summary" open><summary>Resumen del registro<ChevronDown size={16} aria-hidden="true" /></summary><div className="record-summary-content">
          <div className="record-summary-item"><Building2 size={18} aria-hidden="true" /><div><strong>{values.customer || 'Cliente por definir'}</strong>{values.code && <small>Correlativo {values.code}</small>}</div></div>
          <div className="record-summary-item"><BookOpen size={17} aria-hidden="true" /><span>{courseNames.join(' · ') || 'Sin cursos seleccionados'}</span></div>
          <div className="record-summary-facts"><div><span>Tipo</span><strong>{kind === 'service' ? 'Servicio' : values.certificateKind === 'INSPECTION' ? 'Certificado de inspección' : 'Certificado de operador'}</strong></div>{kind === 'service' && <div><span>Modalidad</span><strong>{values.modality ? modalityLabel(values.modality) : 'Por definir'}</strong></div>}<div><span>Estado</span><strong>{status}</strong></div></div>
          <p className="record-summary-caption">{kind === 'service' ? 'Programación' : 'Fecha de venta'}</p>
          {kind === 'service' ? sessions.length ? sessions.map((session, index) => <div className="record-summary-item" key={index}><CalendarDays size={16} aria-hidden="true" /><div>{dateLabel(session.date)}<small>{session.startTime && session.endTime ? `${session.startTime}–${session.endTime}` : 'Sin horario definido'}{values.modality === 'MIXED' && session.modality ? ` · ${modalityLabel(session.modality)}` : ''}</small>{session.courseIds?.length>0&&<small>{assignedItems(courses,session.courseIds).map(course=>course.name).join(' · ')}</small>}{session.instructorIds?.length>0&&<small>{assignedItems(instructors,session.instructorIds).map(instructor=>instructor.name).join(' · ')}</small>}</div></div>) : <p className="record-summary-empty">Sin fechas registradas</p> : <div className="record-summary-item"><CalendarDays size={16} aria-hidden="true" /><span>{dateLabel(values.saleDate)}</span></div>}
          {kind === 'service' && <div className="record-summary-item"><UserRound size={16} aria-hidden="true" /><span>{instructorNames.join(' · ') || 'Sin instructor asignado'}</span></div>}
          <div className="record-summary-facts"><div><span>Comercial</span><strong>{values.commercial || 'Sin asignar'}</strong></div></div>
          <div className="record-summary-total"><span>Importe total</span><strong>{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number.isFinite(amount) ? amount : 0)}</strong><small>{kind === 'sale' && values.status === PAYMENT_WITHOUT_INVOICE ? 'No suma a facturación ni a los totales de certificados.' : kind === 'service' ? 'Un importe para todas las jornadas.' : 'Un importe para todos los cursos.'}</small></div>
        </div></details>
      </aside>
    </div>
    <div className="record-editor-footer">{actions}</div>
  </div>;
}
