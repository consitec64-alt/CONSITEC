'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Plus, X, Check, Search, CalendarDays, Info, Trash2, Building2, BookOpen, UserRound, FlaskConical } from 'lucide-react';
import { classHours, durationLabel } from '@/lib/class-hours';
import { sessionsOverlap } from '@/lib/instructor-availability';
import styles from './preview.module.css';

type Mode = 'service' | 'certificate';
type Session = { id: number; date: string; startTime: string; endTime: string; modality: string };
const courses = ['Trabajo en altura', 'Seguridad industrial', 'Espacios confinados', 'Operación de montacargas'];
const instructors = [
  { id: 'percy', name: 'Percy Palacios', initials: 'PP', bookings: [{ date: '2026-10-19', startTime: '09:00', endTime: '12:00' }] },
  { id: 'carlos', name: 'Carlos Mendoza', initials: 'CM', bookings: [{ date: '2026-10-19', startTime: '15:00', endTime: '18:00' }] },
  { id: 'maria', name: 'María Torres', initials: 'MT', bookings: [] },
];
const seed = () => ({ customer: 'Constructora Andina S.A.C.', code: '0042', courses: ['Trabajo en altura'], amount: '1200', status: 'SCHEDULED', invoice: '', salesperson: 'Ana Castillo', kind: 'OPERATOR', customerType: 'COMPANY', saleDate: '2026-10-19' });
const dateLabel = (date: string) => date ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z')) : 'Fecha pendiente';
const money = (value: string) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value) || 0);
function Section({ number, title, subtitle, children }: { number: string; title: string; subtitle: string; children: ReactNode }) {
  return <section className={styles.section}><div className={styles.sectionTitle}><span>{number}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>{children}</section>;
}

export default function FormsPreview() {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);
  const [mode, setMode] = useState<Mode>('service');
  const [drafts, setDrafts] = useState({ service: seed(), certificate: { ...seed(), amount: '450' } });
  const [sessions, setSessions] = useState<Session[]>([{ id: 1, date: '2026-10-19', startTime: '14:00', endTime: '17:00', modality: 'IN_PERSON' }]);
  const [modality, setModality] = useState('IN_PERSON');
  const [selected, setSelected] = useState(['percy']);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const draft = drafts[mode], service = mode === 'service', natural = !service && draft.customerType === 'NATURAL_PERSON';
  const update = (values: Partial<ReturnType<typeof seed>>) => setDrafts(old => ({ ...old, [mode]: { ...old[mode], ...values } }));
  const busy = (instructor: typeof instructors[number]) => instructor.bookings.filter(booking => sessions.some(session => session.date && sessionsOverlap({ ...session, date: new Date(session.date + 'T09:00:00Z') }, { ...booking, date: new Date(booking.date + 'T09:00:00Z') })));
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6500); return () => clearTimeout(timer); }, [notice]);
  const open = (next: Mode) => { setMode(next); setNotice(''); dialog.current?.showModal(); body.current?.scrollTo({ top: 0 }); };
  const switchMode = (next: Mode) => { setMode(next); setNotice(''); body.current?.scrollTo({ top: 0 }); };
  const changeSession = (id: number, values: Partial<Session>) => setSessions(old => old.map(s => s.id === id ? { ...s, ...values } : s));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.courses.length) { setNotice('Selecciona al menos un curso.'); return; }
    if (service) {
      if (new Set(sessions.map(s => s.date)).size !== sessions.length) { setNotice('Cada fecha debe aparecer una sola vez.'); return; }
      if (sessions.some(s => (s.startTime || s.endTime) && !classHours(s.startTime, s.endTime))) { setNotice('Completa ambas horas y coloca el fin después del inicio.'); return; }
      if (instructors.some(i => selected.includes(i.id) && busy(i).length)) { setNotice('Hay un cruce de horario. Cambia la jornada o quita al instructor ocupado.'); return; }
    }
    setNotice(`✓ ${service ? 'Servicio' : 'Venta'} validado en el preview. No se guardaron datos reales.`);
  };
  const statusText = draft.status === 'INVOICED' ? 'Facturado' : draft.status === 'PAID' ? 'Pagado' : service ? 'Programado' : 'Pendiente';
  return <div className={styles.screen}>
    <aside className={styles.sidebar}><div className={styles.brand}><span>C<b>›</b></span>CONSITEC</div><p>ESPACIO COMERCIAL</p><div className={styles.activeNav}>▦ &nbsp; Panel comercial</div><div>▤ &nbsp; Registro de instructores</div><div>◷ &nbsp; Historial</div><div className={styles.sidebarFoot}><FlaskConical size={17} /> Propuesta de interfaz</div></aside>
    <main className={styles.dashboard}><header><span>Panel comercial <small> / Agenda</small></span><span className={styles.avatar}>AC</span></header><div className={styles.dashboardContent}><div className={styles.pageHeading}><div><p className={styles.eyebrow}>TU OPERACIÓN, EN UN SOLO LUGAR</p><h1>Panel comercial</h1><p>Organiza tus servicios y ventas del mes.</p></div><div className={styles.actions}><button onClick={() => open('certificate')}>Venta de certificado</button><button className={styles.primary} onClick={() => open('service')}><Plus size={16} /> Nuevo servicio</button></div></div><div className={styles.metrics}>{[['Facturación del mes', 'S/ 24,800'], ['Servicios programados', '18'], ['Certificados vendidos', '32']].map(([label, value]) => <div key={label}><p>{label}</p><strong>{value}</strong><small>Datos de ejemplo</small></div>)}</div><div className={styles.calendar}><h2>Octubre 2026</h2><div>{Array.from({ length: 28 }, (_, i) => <span key={i}>{i + 1}</span>)}</div></div><p className={styles.demoNote}><FlaskConical size={16} /> Preview independiente con datos de ejemplo. Prueba ambos formularios; no se registran ventas reales.</p></div></main>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="preview-title" onCancel={() => setNotice('')}>
      <div className={styles.dialogShell}>
        <div className={styles.previewBar}><span><i /> PREVIEW INTERACTIVO</span><div aria-label="Tipo de formulario"><button type="button" aria-pressed={service} onClick={() => switchMode('service')}>Nuevo servicio</button><button type="button" aria-pressed={!service} onClick={() => switchMode('certificate')}>Venta de certificado</button></div></div>
        <header className={styles.dialogHeader}><div><p><CalendarDays size={14} /> REGISTRO COMERCIAL</p><h2 id="preview-title">{service ? 'Nuevo servicio' : 'Venta de certificado'}</h2><span>{service ? 'Programa las clases y elige a tu equipo en un solo lugar.' : 'Solo los datos que necesitas para esta venta.'}</span></div><button type="button" className={styles.iconButton} onClick={() => dialog.current?.close()} aria-label="Cerrar ventana"><X size={20} /></button></header>
        <form id="preview-form" className={styles.dialogBody} onSubmit={submit}>
          <div className={styles.scrollArea} ref={body}><div className={styles.formContent}>
            <Section number="01" title="Cliente y referencia" subtitle={service ? 'Identifica a la empresa que recibirá el servicio.' : 'Define qué vendes y a quién.'}>
              <div className={styles.fields}>
                {!service && <><label>Tipo de certificado<select value={draft.kind} onChange={e => update({ kind: e.target.value, ...(e.target.value === 'INSPECTION' ? { customerType: 'COMPANY', status: draft.status === 'PAID' ? 'SCHEDULED' : draft.status } : {}) })}><option value="OPERATOR">Operador</option><option value="INSPECTION">Inspección</option></select></label><label>Tipo de cliente<select value={draft.customerType} disabled={draft.kind === 'INSPECTION'} onChange={e => update({ customerType: e.target.value, status: 'SCHEDULED' })}><option value="COMPANY">Empresa</option><option value="NATURAL_PERSON">Persona natural</option></select></label></>}
                <label className={styles.full}>{natural ? 'Nombre del cliente' : 'Empresa / cliente'}<input value={draft.customer} onChange={e => update({ customer: e.target.value })} maxLength={200} required placeholder={natural ? 'Nombres y apellidos' : 'Nombre o razón social'} /></label>
                {!natural && <label>Código de correlativo <small>Opcional</small><input value={draft.code} onChange={e => update({ code: e.target.value })} placeholder="Ej. 0042" pattern="[0-9]{4}" inputMode="numeric" maxLength={4} title="Exactamente cuatro dígitos si se completa" /></label>}
                {!service && draft.kind === 'INSPECTION' && <p className={`${styles.hint} ${styles.full}`}><Info size={14} /> Los certificados de inspección corresponden a empresas.</p>}
              </div>
            </Section>
            <Section number="02" title="Cursos" subtitle="Selecciona uno o varios. El importe se registra una sola vez.">
              <div className={styles.courseChoices}>{courses.map(course => <label key={course}><input type="checkbox" checked={draft.courses.includes(course)} onChange={e => update({ courses: e.target.checked ? [...draft.courses, course] : draft.courses.filter(c => c !== course) })} />{course}</label>)}</div>
            </Section>
            {service && <>
              <Section number="03" title="Fechas y horarios" subtitle="Una jornada por fecha, con su propio horario.">
                <label className={styles.modality}>Modalidad<select value={modality} onChange={e => setModality(e.target.value)}><option value="IN_PERSON">Presencial</option><option value="VIRTUAL">Virtual</option><option value="MIXED">Virtual / Presencial</option></select></label>
                {sessions.map((session, index) => { const hours = classHours(session.startTime, session.endTime); return <div key={session.id} className={styles.session}><div className={styles.sessionHeader}><span>JORNADA {String(index + 1).padStart(2, '0')}</span><button type="button" className={styles.iconButton} disabled={sessions.length === 1} aria-label={`Quitar jornada ${index + 1}`} onClick={() => setSessions(old => old.filter(s => s.id !== session.id))}><Trash2 size={15} /></button></div><div className={styles.sessionFields}><label>Fecha<input type="date" required value={session.date} onChange={e => changeSession(session.id, { date: e.target.value })} /></label><label>Inicio<input type="time" required={!!session.endTime} value={session.startTime} onChange={e => changeSession(session.id, { startTime: e.target.value })} /></label><label>Fin<input type="time" required={!!session.startTime} value={session.endTime} onChange={e => changeSession(session.id, { endTime: e.target.value })} /></label>{modality === 'MIXED' && <label className={styles.full}>Modalidad de la jornada<select value={session.modality} onChange={e => changeSession(session.id, { modality: e.target.value })}><option value="IN_PERSON">Presencial</option><option value="VIRTUAL">Virtual</option></select></label>}</div><p className={styles.duration}>{hours ? `${durationLabel(hours.instructionalMinutes)} de clase · ${hours.breakMinutes ? 'descanso de 1 h descontado' : 'sin descuento de descanso'}` : session.startTime || session.endTime ? 'Completa ambas horas; el fin debe ser posterior al inicio.' : 'Sin horario · reserva el día completo'}</p></div>; })}
                <button className={styles.textButton} type="button" disabled={sessions.length >= 366} onClick={() => setSessions(old => [...old, { id: nextId.current++, date: '', startTime: '', endTime: '', modality: 'IN_PERSON' }])}><Plus size={15} /> Agregar otra fecha</button><p className={styles.hint}><Info size={14} /> Puedes dejar ambas horas vacías. Una jornada sin horario reserva el día completo.</p>
              </Section>
              <Section number="04" title="Instructores" subtitle="La disponibilidad se actualiza con tus fechas y horarios.">
                <div className={styles.search}><Search size={15} /><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar instructor…" aria-label="Buscar instructor" /></div>
                {instructors.filter(i => i.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map(instructor => { const conflicts = busy(instructor), checked = selected.includes(instructor.id); return <label key={instructor.id} className={`${styles.instructor} ${conflicts.length ? styles.busy : ''}`}><input type="checkbox" checked={checked} disabled={!!conflicts.length && !checked} onChange={e => setSelected(old => e.target.checked ? [...old, instructor.id] : old.filter(id => id !== instructor.id))} /><span className={styles.initials}>{instructor.initials}</span><span className={styles.instructorInfo}>{instructor.name}<small>{conflicts.length ? `No disponible: ${conflicts.map(b => `${b.date} · ${b.startTime}–${b.endTime}`).join(', ')}` : 'Disponible para las jornadas seleccionadas'}</small></span><span className={styles.badge}>{conflicts.length ? 'Ocupado' : 'Disponible'}</span></label>; })}
                {!instructors.some(i => i.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))) && <p className={styles.empty}>No hay coincidencias.</p>}
                {instructors.some(i => selected.includes(i.id) && busy(i).length) && <p className={styles.warning} role="alert">Un instructor seleccionado tiene un cruce de horario. Cambia las horas o quita su selección.</p>}
              </Section>
            </>}
            <Section number={service ? '05' : '03'} title="Importe y facturación" subtitle={service ? 'Un importe total para todas las jornadas.' : 'Un importe total para todos los cursos.'}>
              <div className={styles.fields}>{!service && <label>Fecha de venta<input type="date" required value={draft.saleDate} onChange={e => update({ saleDate: e.target.value })} /></label>}
                <label>Importe total (S/)<input type="number" min="0" max="99999999.99" step="0.01" value={draft.amount} onChange={e => update({ amount: e.target.value })} placeholder="0.00" /></label><label>Estado<select value={draft.status} onChange={e => update({ status: e.target.value })}><option value="SCHEDULED">{service ? 'Programado' : 'Pendiente'}</option>{natural ? <option value="PAID">Pagado</option> : <option value="INVOICED">Facturado</option>}</select></label>{!natural && <label>Fecha de facturación <small>Opcional</small><input type="date" value={draft.invoice} onChange={e => update({ invoice: e.target.value })} /><small>Al facturar se usará hoy si está vacía.</small></label>}</div>
              <details className={styles.options}><summary>Opciones adicionales</summary><div>{service && <><label className={styles.checkLabel}><input type="checkbox" />Solo certificados</label><label>Viáticos<select><option>No aplica</option><option>Avión</option><option>Bus</option></select></label></>}<label>Comercial asignado<select value={draft.salesperson} onChange={e => update({ salesperson: e.target.value })}><option>Ana Castillo</option><option>Luis Ramírez</option></select></label></div></details>
            </Section>
          </div>
          <aside className={styles.summary} aria-label="Resumen del registro"><div className={styles.summaryInner}><p className={styles.summaryLabel}>RESUMEN DEL REGISTRO</p><div className={styles.summaryItem}><Building2 size={18} /><div><strong>{draft.customer || 'Cliente por definir'}</strong><p>{natural ? 'Persona natural' : 'Empresa'}</p></div></div><div className={styles.summaryItem}><BookOpen size={18} /><div>{draft.courses.join(' · ') || 'Selecciona al menos un curso'}</div></div><div className={styles.summaryRule} /><div className={styles.summaryRow}><span>Tipo</span><b>{service ? 'Servicio' : draft.kind === 'INSPECTION' ? 'Inspección' : 'Operador'}</b></div>{service && <div className={styles.summaryRow}><span>Modalidad</span><b>{modality === 'MIXED' ? 'Virtual / Presencial' : modality === 'VIRTUAL' ? 'Virtual' : 'Presencial'}</b></div>}<div className={styles.summaryRow}><span>Estado</span><b><i />{statusText}</b></div><div className={styles.summaryRule} /><p className={styles.summaryLabel}>{service ? 'PROGRAMACIÓN' : 'FECHA DE VENTA'}</p>{service ? sessions.map(s => <div className={styles.summaryItem} key={s.id}><CalendarDays size={16} /><div>{dateLabel(s.date)}<p>{s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : 'Sin horario definido'}</p></div></div>) : <div className={styles.summaryItem}><CalendarDays size={16} /><span>{dateLabel(draft.saleDate)}</span></div>}{service && <div className={styles.summaryItem}><UserRound size={16} /><span>{instructors.filter(i => selected.includes(i.id)).map(i => i.name).join(', ') || 'Sin asignar'}</span></div>}<div className={styles.total}><span>Importe total</span><strong>{money(draft.amount)}</strong><small>{service ? 'Un importe para todas las jornadas.' : 'Un importe para todos los cursos.'}</small></div><p className={styles.summaryHint}><FlaskConical size={14} /> Datos de ejemplo. Puedes modificar los campos para probar la propuesta.</p></div></aside>
          </div>
        </form>
        <footer className={styles.footer}><span><FlaskConical size={14} /> Demo · No guarda registros reales</span><div className={styles.actions}><button type="button" onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" form="preview-form" className={styles.primary}><Check size={16} />{service ? 'Guardar servicio' : 'Guardar venta'}</button></div></footer>
        {notice && <div className={styles.notice} role="status" aria-live="polite"><span>{notice}</span><button type="button" className={styles.iconButton} aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
      </div>
    </dialog>
  </div>;
}
