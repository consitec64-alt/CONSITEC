"use client";
import { useRef, useState, type FormEvent } from 'react';
import { ChevronDown, Zap } from 'lucide-react';
import CatalogPicker from '@/components/catalog-picker';
import TimePicker from '@/components/time-picker';
import { useInstructorAvailability } from '@/components/use-instructor-availability';
import { classHours, durationLabel } from '@/lib/class-hours';
import { draftFromForm, type DraftValues } from '@/lib/service-draft';
import type { Meta } from '@/lib/ui-types';

type Props = {
  hidden: boolean; disabled: boolean; defaultDate: string; courses: Meta[]; instructors: Meta[];
  salespeople: Meta[]; isAdmin: boolean; assignedRep: Meta | null;
  onSaved: () => Promise<void>; onMoreDetails: (values: DraftValues) => void;
};
type Match = { id: string; name: string; date: string; amount: string };
export default function QuickService(props: Props) {
  const [open, setOpen] = useState(false), [generation, setGeneration] = useState(0);
  return <details hidden={props.hidden} className="panel quick-service" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span><Zap size={20} aria-hidden="true" /><span><strong>Servicio rápido</strong><small>Registra una clase con los datos principales.</small></span></span><ChevronDown size={20} aria-hidden="true" /></summary>
    <QuickServiceForm key={generation} {...props} active={open && !props.hidden} onReset={() => setGeneration(previous => previous + 1)} />
  </details>;
}
function QuickServiceForm({ disabled, defaultDate, courses, instructors, salespeople, isAdmin, assignedRep, onSaved, onMoreDetails, active, onReset }: Props & { active: boolean; onReset: () => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [courseIds, setCourseIds] = useState<string[]>([]), [instructorIds, setInstructorIds] = useState<string[]>([]);
  const [dateOverride, setDateOverride] = useState<string | null>(null), [startTime, setStartTime] = useState(''), [endTime, setEndTime] = useState('');
  const [modality, setModality] = useState(''), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState<{ body: Record<string, unknown>; matches: Match[] } | null>(null);
  const date = dateOverride ?? defaultDate, sessions = [{ date, startTime, endTime, modality }];
  const availability = useInstructorAvailability(sessions, undefined, active);
  const hours = classHours(startTime, endTime);
  const noCommercial = !isAdmin && !assignedRep;
  const locked = disabled || saving;
  async function save(body: Record<string, unknown>) {
    if (locked || noCommercial) return;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (response.status === 401) { window.location.assign('/login'); return; }
      const data = await response.json();
      if (!response.ok) {
        if (data.code === 'POSSIBLE_DUPLICATE') { setDuplicate({ body, matches: data.matches }); return; }
        throw Error(data.error || 'No se pudo guardar el servicio');
      }
      setDuplicate(null); onReset(); await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el servicio'); }
    finally { setSaving(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked || duplicate || noCommercial) return;
    setError('');
    if (!courseIds.length || !instructorIds.length) { setError('Selecciona al menos un curso y un instructor.'); return; }
    if ((startTime || endTime) && !hours) { setError('Completa un horario válido; el fin debe ser posterior al inicio.'); return; }
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void save({ ...values, courseIds, instructorIds, sessions, amount: Number(values.amount || 0), status: 'SCHEDULED', certificatesOnly: false, travelMode: 'NONE', locationId: null });
  }
  return <form ref={form} className="quick-service-form" onSubmit={submit}>
    <p className="form-note">Una fecha y un importe para todos los cursos seleccionados. Para varias fechas, ubicación o facturación, abre Más detalles.</p>
    <fieldset className="form-grid quick-service-fields" disabled={locked || !!duplicate}>
      <input type="hidden" name="sessions" value={JSON.stringify(sessions)} /><input type="hidden" name="status" value="SCHEDULED" /><input type="hidden" name="travelMode" value="NONE" />
      <label className="full-width">Empresa / cliente<input name="company" required maxLength={200} placeholder="Nombre o razón social" /></label>
      <CatalogPicker title="Cursos del servicio rápido" name="courseIds" items={courses} selected={courseIds} onChange={setCourseIds} description="Busca y selecciona los cursos." className="quick-course-picker" />
      <label>Fecha<input name="serviceDates" type="date" value={date} required onChange={event => setDateOverride(event.target.value)} /></label>
      <label>Modalidad<select name="modality" value={modality} onChange={event => setModality(event.target.value)}><option value="">Por definir</option><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">Presencial</option></select></label>
      <div className="quick-service-time"><span>Inicio (24 h)</span><TimePicker name="startTime" label="inicio del servicio rápido" value={startTime} required={!!endTime} onChange={setStartTime} /></div>
      <div className="quick-service-time"><span>Fin (24 h)</span><TimePicker name="endTime" label="fin del servicio rápido" value={endTime} required={!!startTime} onChange={setEndTime} /></div>
      <p className="form-note full-width">{hours ? `${durationLabel(hours.instructionalMinutes)} de clase${hours.breakMinutes ? ' · descanso de 1 h descontado' : ''}` : 'Las horas son opcionales. Sin horario se reserva el día completo para los instructores.'}</p>
      <CatalogPicker title="Instructores del servicio rápido" name="instructorIds" items={instructors} selected={instructorIds} onChange={setInstructorIds} unavailable={availability.conflicts} checking={availability.checking} description={availability.checking ? 'Comprobando disponibilidad…' : 'Disponibilidad según la fecha y las horas elegidas.'} className="quick-instructor-picker" />
      <label>Importe total (S/)<input name="amount" type="number" min="0" max="99999999.99" step="0.01" placeholder="0.00" /><small>Opcional; puedes completarlo después.</small></label>
      {isAdmin ? <label>Comercial<select name="salespersonId" defaultValue=""><option value="">Sin asignar</option>{salespeople.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label> : <div className="assigned-commercial"><span>Comercial asignado</span><strong>{assignedRep?.name || 'Sin asignar'}</strong></div>}
    </fieldset>
    {instructorIds.filter(id => availability.conflicts[id]?.length).map(id => <p className="error-banner" role="alert" key={id}>{instructors.find(i => i.id === id)?.name} no está disponible para esta fecha y horario. Cambia el instructor o la programación.</p>)}
    {availability.error && <p className="error-banner" role="alert">{availability.error}. Se volverá a validar al guardar.</p>}
    {noCommercial && <p className="error-banner" role="alert">Un administrador debe asignarte un comercial en Usuarios antes de registrar servicios.</p>}
    {error && <p className="error-banner" role="alert">{error}</p>}
    {duplicate && <div className="error-banner quick-service-duplicate" role="alert"><p>Hay servicios con el mismo cliente, curso y fecha. Revisa antes de continuar.</p><ul>{duplicate.matches.map(match => <li key={match.id}>{match.name} · {match.date}</li>)}</ul><div className="quick-service-actions"><button type="button" className="btn secondary" disabled={locked} onClick={() => setDuplicate(null)}>Revisar datos</button><button type="button" className="btn" disabled={locked} onClick={() => void save({ ...duplicate.body, allowDuplicate: true })}>Guardar de todos modos</button></div></div>}
    <div className="quick-service-actions"><button type="button" className="btn secondary" disabled={locked || !!duplicate} onClick={() => { if (form.current) onMoreDetails(draftFromForm(form.current)); }}>Más detalles</button><button className="btn" disabled={locked || !!duplicate || noCommercial || !courses.length || availability.checking}>{saving ? 'Guardando…' : 'Guardar servicio rápido'}</button></div>
  </form>;
}
