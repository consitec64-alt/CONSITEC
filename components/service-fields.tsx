"use client";
import { draftSessions, type DraftValues } from "@/lib/service-draft";
import TimePicker from "@/components/time-picker";
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { dayModality } from '@/lib/class-modality';
import { classHours, durationLabel } from '@/lib/class-hours';
import CatalogPicker from '@/components/catalog-picker';
import { Meta, Service, serviceDays, serviceInstructors } from '@/lib/ui-types';

export default function ServiceFields({ draft, service, defaultDate, initialDates, fixedModality, previewMixed = false, instructors, includeCorrelative = true, includeInvoiceDate = true }: { draft?: DraftValues | null; service: Service | null; defaultDate: string; initialDates?: string[]; fixedModality?: string | null; previewMixed?: boolean; instructors: Meta[]; includeCorrelative?: boolean; includeInvoiceDate?: boolean }) {
  const [modality, setModality] = useState(fixedModality || service?.modality || (typeof draft?.modality==='string'?draft.modality:''));
  const displayedModality = previewMixed ? 'MIXED' : modality;
  const [sessions, setSessions] = useState(() => draftSessions(draft?.sessions) ?? (service ? (serviceDays(service).length ? serviceDays(service) : ['']) : initialDates?.length ? initialDates : [defaultDate]).map(date => {
    const saved = service?.dates?.find(d => d.date.slice(0, 10) === date);
    return { date, startTime: saved?.startTime || '', endTime: saved?.endTime || '', modality: dayModality(fixedModality || service?.modality, saved?.modality) || '' };
  }));
  const changeSession = (index: number, field: 'date' | 'startTime' | 'endTime' | 'modality', value: string) => setSessions(previous => previous.map((s, i) => i === index ? { ...s, [field]: value } : s));
  const [instructorIds,setInstructorIds]=useState(()=>service?serviceInstructors(service).map(i=>i.id):Array.isArray(draft?.instructorIds)?draft.instructorIds:[]);
  const [conflicts, setConflicts] = useState<Record<string, string[]>>({});
  const [availabilityError, setAvailabilityError] = useState('');
  const [checking, setChecking] = useState(false);
  const key = JSON.stringify(sessions.filter(s => s.date).map(({date, startTime, endTime}) => ({date, startTime, endTime})));
  useEffect(() => {
    const requested = JSON.parse(key) as {date:string;startTime:string;endTime:string}[];
    if (!requested.length || requested.some(s => (s.startTime || s.endTime) && !classHours(s.startTime, s.endTime))) { setConflicts({}); setChecking(false); setAvailabilityError(''); return; }
    const controller = new AbortController();
    const query = new URLSearchParams();requested.forEach(s => { query.append('date', s.date); query.append('startTime', s.startTime); query.append('endTime', s.endTime); });
    if (service) query.set('excludeServiceId', service.id);
    setChecking(true);setAvailabilityError('');
    void fetch(`/api/instructors/availability?${query}`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo comprobar disponibilidad');
      setConflicts(data.conflicts);
    }).catch(error => { if (!controller.signal.aborted) { setConflicts({});setAvailabilityError(error instanceof Error ? error.message : 'No se pudo comprobar disponibilidad'); } })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [key, service]);
  return <>
    {includeCorrelative && <label className="full-width">Código de correlativo <input name="correlativeCode" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} defaultValue={service?.correlativeCode || ''} placeholder="Ej. 0042" title="Si se ingresa, exactamente 4 dígitos numéricos" /></label>}
    <input type="hidden" name="sessions" value={JSON.stringify(sessions)} />
    <label>Modalidad de la clase<select name="modality" disabled={!!fixedModality} value={displayedModality} onChange={e => setModality(e.target.value)}><option value="">Selecciona la modalidad</option><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">Presencial</option><option value="MIXED">Virtual / Presencial</option></select></label>
    {displayedModality === 'MIXED' && <p className="form-note full-width">Elige Virtual o Presencial para cada fecha. Todas las jornadas conservan un único importe.</p>}
    <fieldset className="service-dates full-width"><legend>Fechas y horario de las clases</legend><p>Cada fecha cuenta como un servicio. El importe es único para todas las clases. Horario de 00:00 a 23:59, dentro del mismo día.</p>{sessions.map((session, index) => {
      const hours = classHours(session.startTime, session.endTime);
      return <div className="class-session" key={index}><div className={`class-session-fields ${displayedModality === 'MIXED' ? 'mixed-session-fields' : ''}`}><label>Fecha {index + 1}<input name="serviceDates" type="date" value={session.date} required onChange={e => changeSession(index, 'date', e.target.value)} /></label><div className="session-time"><span>Inicio (24 h)</span><TimePicker name="startTime" required={!!session.endTime} label={`inicio de fecha ${index+1}`} value={session.startTime} onChange={value=>changeSession(index,'startTime',value)}/></div><div className="session-time"><span>Fin (24 h)</span><TimePicker name="endTime" required={!!session.startTime} label={`fin de fecha ${index+1}`} value={session.endTime} onChange={value=>changeSession(index,'endTime',value)}/></div>{displayedModality === 'MIXED' && <label className="session-modality">Modalidad de la fecha {index + 1}<select name="sessionModality" aria-label={`Modalidad de la fecha ${index + 1}`} value={session.modality} required onChange={e => changeSession(index, 'modality', e.target.value)}><option value="">Selecciona la modalidad</option><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">Presencial</option></select></label>}<button type="button" className="icon-button danger" disabled={sessions.length === 1} aria-label={`Quitar fecha ${index + 1}`} onClick={() => setSessions(previous => previous.filter((_, i) => i !== index))}><Trash2 size={17} /></button></div><small aria-live="polite">{hours ? `${durationLabel(hours.instructionalMinutes)} de clase${hours.breakMinutes ? ' · descanso de 1 h descontado' : ' · sin descuento de descanso'}` : session.startTime && session.endTime ? 'El fin debe ser posterior al inicio.' : 'Puedes dejar ambas horas vacías; si ingresas una, completa también la otra.'}</small></div>;
    })}<p className="form-note">Total de horas registradas: {durationLabel(sessions.reduce((total, session) => total + (classHours(session.startTime, session.endTime)?.instructionalMinutes ?? 0), 0))}. El descanso se descuenta por fecha.</p><button type="button" className="btn secondary" disabled={sessions.length >= 366} onClick={() => setSessions(previous => [...previous, { date: '', startTime: '', endTime: '', modality: displayedModality === 'MIXED' ? '' : modality }])}><Plus size={16} />Agregar fecha</button></fieldset>
    <CatalogPicker title="Instructores del servicio" name="instructorIds" items={instructors} selected={instructorIds} onChange={setInstructorIds} unavailable={conflicts} checking={checking} className="instructor-picker" description={checking?'Comprobando disponibilidad…':'Selecciona uno o varios instructores para todas las fechas. '}/>
    {includeInvoiceDate && <label>Fecha de facturación <input name="invoiceDate" type="date" defaultValue={service?.invoicedAt?.slice(0,10) || ""} /><small>Al marcar Facturado se usará hoy si está vacía. El importe sumará en ese mes.</small></label>}
    <label>Viáticos <select name="travelMode" defaultValue={service?.travelMode || (typeof draft?.travelMode==='string'?draft.travelMode:'NONE')}><option value="NONE">No aplica</option><option value="PLANE">Avión</option><option value="BUS">Bus</option></select></label>
    {instructorIds.filter(id=>conflicts[id]?.length).map(id=><p key={id} className="error-banner full-width" role="alert">{instructors.find(i=>i.id===id)?.name} no está disponible para: {conflicts[id].join(', ')}. Quita ese instructor o cambia las fechas u horas.</p>)}
    {availabilityError && <p className="error-banner full-width" role="alert">{availabilityError}. La disponibilidad se volverá a validar al guardar.</p>}
  </>;
}
