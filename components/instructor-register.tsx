"use client";
import { FormEvent, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Meta } from '@/lib/ui-types';
import { InstructorRegisterRow, registerDate, registerMonth } from '@/lib/instructor-register';
import { durationLabel } from '@/lib/class-hours';

type Filters = { instructorId: string; company: string; courseId: string; modality: string; from: string; to: string };
const empty: Filters = { instructorId: '', company: '', courseId: '', modality: '', from: '', to: '' };
export default function InstructorRegister({ month, year, instructors, courses, refreshToken }: { month: number; year: number; instructors: Meta[]; courses: Meta[]; refreshToken: number }) {
  const [draft, setDraft] = useState<Filters>(empty), [filters, setFilters] = useState<Filters>(empty);
  const [rows, setRows] = useState<InstructorRegisterRow[]>([]), [confirmations, setConfirmations] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [exporting, setExporting] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ month: String(month), year: String(year) });
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
    setLoading(true); setError('');
    void fetch(`/api/instructor-register?${query}`, { signal: controller.signal }).then(async response => {
      if (response.status === 401) { window.location.assign('/login'); return; }
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo cargar el registro');
      if (!controller.signal.aborted) setRows(data.rows);
    }).catch(err => { if (!controller.signal.aborted) { setRows([]); setError(err instanceof Error ? err.message : 'No se pudo cargar el registro'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, year, filters, refreshToken, reload]);
  const editFilter = (key: keyof Filters, value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  const apply = (event: FormEvent) => { event.preventDefault(); setFilters({ ...draft }); };
  async function download() {
    if (exporting || loading || error) return;
    setExporting(true);
    try {
      const { registerWorkbook } = await import('@/lib/register-excel');
      const buffer = new Uint8Array(registerWorkbook(rows, confirmations)).buffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a'); link.href = url; link.download = `registro-instructores-${year}-${String(month).padStart(2, '0')}.xlsx`; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('No se pudo generar el Excel. Inténtalo nuevamente.'); }
    finally { setExporting(false); }
  }
  return <section className="panel instructor-register"><div className="section-heading"><div><h2>Registro de instructores</h2><p>Se actualiza desde la agenda. Una fila por fecha y horas de clase sin descanso.</p></div><button className="btn secondary" disabled={loading || exporting || !!error || !rows.length} onClick={() => void download()}><Download size={16} />{exporting ? 'Generando…' : 'Exportar a Excel'}</button></div>
    <form className="register-filters" onSubmit={apply}>
      <label>Instructor<select value={draft.instructorId} onChange={e => editFilter('instructorId', e.target.value)}><option value="">Todos los instructores</option>{instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
      <label>Empresa<input value={draft.company} maxLength={200} onChange={e => editFilter('company', e.target.value)} placeholder="Buscar empresa…" /></label>
      <label>Curso<select value={draft.courseId} onChange={e => editFilter('courseId', e.target.value)}><option value="">Todos los cursos</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Modalidad<select value={draft.modality} onChange={e => editFilter('modality', e.target.value)}><option value="">Todas las modalidades</option><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">Presencial</option></select></label>
      <label>Desde<input type="date" value={draft.from} onChange={e => editFilter('from', e.target.value)} /></label><label>Hasta<input type="date" value={draft.to} onChange={e => editFilter('to', e.target.value)} /></label>
      <div className="register-filter-actions"><button className="btn" disabled={loading}>Aplicar filtros</button><button type="button" className="btn secondary" disabled={loading} onClick={() => { setDraft(empty); setFilters({ ...empty }); }}>Limpiar filtros</button><button type="button" className="icon-button" aria-label="Actualizar registro" disabled={loading} onClick={() => setReload(n => n + 1)}><RefreshCw size={16} /></button></div>
    </form>
    <p className="form-note">Los filtros se aplican al mes seleccionado arriba. Confirmación es temporal: se pierde al salir del apartado, cambiar de mes o recargar. No modifica el servicio.</p>
    {error && <p className="error-banner" role="alert">{error}</p>}
    <div className="split register-totals" aria-live="polite"><span>{loading ? 'Cargando registro…' : `${rows.length} jornadas · ${durationLabel(rows.reduce((sum, row) => sum + (row.instructionalMinutes ?? 0), 0))} registradas`}</span><small>Los horarios antiguos sin completar se muestran como «Sin horario».</small></div>
    <div className="table-scroll" aria-busy={loading}><table><thead><tr>{['Mes', 'Fecha', 'Instructor', 'Empresa', 'Curso(s)', 'Modalidad', 'Lugar', 'Horas de clase', 'Confirmación'].map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{!loading && rows.map(row => <tr key={row.id}><td className="capitalize">{registerMonth(row.date)}</td><td>{registerDate(row.date)}</td><td>{row.instructor}</td><td><strong>{row.company}</strong></td><td>{row.courses.map(course => <small key={course}>{course}</small>)}</td><td>{row.modality}</td><td>{row.location}</td><td>{row.instructionalMinutes === null ? 'Sin horario' : durationLabel(row.instructionalMinutes)}</td><td><input className="register-confirmation" type="checkbox" aria-label={`Confirmación de ${row.company}, ${registerDate(row.date)}, ${row.instructor}`} checked={confirmations.has(row.id)} onChange={event => setConfirmations(previous => { const next = new Set(previous); if (event.target.checked) next.add(row.id); else next.delete(row.id); return next; })} /></td></tr>)}</tbody></table></div>{!loading && !error && !rows.length && <p className="muted">No hay clases para estos filtros. Los servicios «Solo certificados» no forman parte de este registro.</p>}
  </section>;
}
