"use client";
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Meta, Service, serviceDays } from '@/lib/ui-types';

export default function ServiceFields({ service, defaultDate, instructors }: { service: Service | null; defaultDate: string; instructors: Meta[] }) {
  const [dates, setDates] = useState(() => service ? serviceDays(service) : [defaultDate]);
  const [instructorId, setInstructorId] = useState(service?.instructor?.id || '');
  const [conflicts, setConflicts] = useState<Record<string, string[]>>({});
  const [availabilityError, setAvailabilityError] = useState('');
  const [checking, setChecking] = useState(false);
  const key = dates.filter(Boolean).join(',');
  useEffect(() => {
    if (!key) { setConflicts({}); return; }
    const controller = new AbortController();
    const query = new URLSearchParams();key.split(',').forEach(d => query.append('date', d));
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
    <label className="full-width">Código de correlativo<input name="correlativeCode" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} defaultValue={service?.correlativeCode || ''} placeholder="Ej. 0042" title="Exactamente 4 dígitos numéricos" required /></label>
    <fieldset className="service-dates full-width"><legend>Fechas del servicio</legend><p>Un solo servicio y un solo importe para todas las fechas.</p>{dates.map((date, index) => <div className="service-date-row" key={index}><label>Fecha {index + 1}<input name="serviceDates" type="date" value={date} required onChange={e => setDates(previous => previous.map((d, i) => i === index ? e.target.value : d))} /></label><button type="button" className="icon-button danger" disabled={dates.length === 1} aria-label={`Quitar fecha ${index + 1}`} onClick={() => setDates(previous => previous.filter((_, i) => i !== index))}><Trash2 size={17} /></button></div>)}<button type="button" className="btn secondary" disabled={dates.length >= 366} onClick={() => setDates(previous => [...previous, ''])}><Plus size={16} />Agregar fecha</button></fieldset>
    <label>Instructor <small>(opcional)</small><select name="instructorChoice" value={instructorId} onChange={e => setInstructorId(e.target.value)}><option value="">Sin asignar</option>{instructors.map(i => <option key={i.id} value={i.id} disabled={checking || !!conflicts[i.id]?.length}>{i.name}{conflicts[i.id]?.length ? ' — no disponible' : ''}</option>)}</select><input type="hidden" name="instructorId" value={instructorId} /><small aria-live="polite">{checking ? 'Comprobando todas las fechas…' : 'Disponibilidad para las fechas seleccionadas.'}</small></label>
    <label>Fecha de facturación <small>(opcional)</small><input name="invoiceDate" type="date" defaultValue={service?.invoicedAt?.slice(0,10) || ""} /><small>Al marcar Facturado se usará hoy si está vacía. El importe sumará en ese mes.</small></label>
    <label>Viáticos <small>(opcional)</small><select name="travelMode" defaultValue={service?.travelMode || 'NONE'}><option value="NONE">No aplica</option><option value="PLANE">Avión</option><option value="BUS">Bus</option></select></label>
    {!!conflicts[instructorId]?.length && <p className="error-banner full-width" role="alert">El instructor no está disponible para: {conflicts[instructorId].join(', ')}. Selecciona otro instructor o cambia las fechas.</p>}
    {availabilityError && <p className="error-banner full-width" role="alert">{availabilityError}. La disponibilidad se volverá a validar al guardar.</p>}
  </>;
}
