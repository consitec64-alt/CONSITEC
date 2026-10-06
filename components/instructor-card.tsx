"use client";
import { FormEvent, useState } from 'react';
import { ChevronDown, Search, Trash2, Plus } from 'lucide-react';
import { Meta } from '@/lib/ui-types';

export default function InstructorCard({ items, courses, onDone, announce, onDelete }: { items: Meta[]; courses: Meta[]; onDone: () => Promise<void>; announce: (text: string, error?: boolean) => void; onDelete: (id: string, label: string) => void }) {
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  async function save(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();if (busy) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fields = Object.fromEntries(formData);
    setBusy(id || 'new');
    try {
      const response = await fetch(`/api/metadata/instructors${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, courseIds: formData.getAll("courseIds"), sctr: fields.sctr === 'yes' }) });
      if (response.status === 401) { window.location.assign('/login');return; }
      const data = await response.json();if (!response.ok) throw new Error(data.error || 'No se pudo guardar el instructor');
      if (!id) form.reset();
      await onDone();announce('Ficha de instructor guardada.');
    } catch (error) { announce(error instanceof Error ? error.message : 'No se pudo guardar el instructor', true); }
    finally { setBusy(''); }
  }
  return <section className="panel instructor-card"><div className="section-heading"><div><h2>Instructores</h2><p>Despliega un instructor para consultar o editar su ficha.</p></div><span className="count-badge">{items.length}</span></div><label className="search-box"><Search size={16} /><input aria-label="Buscar instructores" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o DNI…" /></label><div className="instructor-list">{items.filter(i => `${i.name} ${i.dni || ''}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map(i => <details className="instructor-details" key={i.id}><summary><span><strong>{i.name}</strong><small>{i.emoExpiresAt ? `EMO vence: ${i.emoExpiresAt.slice(0, 10)}` : 'EMO sin fecha registrada'} · SCTR: {i.sctr ? 'Sí' : 'No'}</small></span><ChevronDown size={17} /></summary><form className="form-grid" onSubmit={e => void save(e, i.id)}><InstructorFields instructor={i} courses={courses} /><div className="instructor-actions full-width"><button className="btn" disabled={!!busy}>{busy === i.id ? 'Guardando…' : 'Guardar ficha'}</button><button type="button" className="user-delete-button" disabled={!!busy} onClick={() => onDelete(i.id, i.name || 'instructor')}><Trash2 size={15} />Eliminar instructor</button></div></form></details>)}</div><details className="instructor-details"><summary><span><Plus size={16} />Agregar instructor</span><ChevronDown size={17} /></summary><form className="form-grid" onSubmit={e => void save(e)}><InstructorFields courses={courses} /><button className="btn full-width" disabled={!!busy}>{busy === 'new' ? 'Agregando…' : 'Agregar instructor'}</button></form></details></section>;
}
function InstructorFields({ instructor: i, courses }: { instructor?: Meta; courses: Meta[] }) {
  return <><label className="full-width">Nombre<input name="name" defaultValue={i?.name} maxLength={200} required /></label><label className="full-width">Dirección <small>(opcional)</small><textarea name="address" defaultValue={i?.address || ''} maxLength={1000} rows={2} /></label><label>DNI <small>(opcional, escritura libre)</small><input name="dni" defaultValue={i?.dni || ''} maxLength={100} /></label><label>EMO — fecha de vencimiento <small>(opcional)</small><input name="emoExpiresAt" type="date" defaultValue={i?.emoExpiresAt?.slice(0, 10) || ''} /></label><fieldset className="instructor-courses full-width"><legend>Cursos del catálogo</legend>{courses.length ? courses.map(course => <label className="checkbox-label" key={course.id}><input type="checkbox" name="courseIds" value={course.id} defaultChecked={i?.courses?.some(c => c.id === course.id)} />{course.name}</label>) : <p className="form-note">Agrega los cursos en Base de soporte para vincularlos a este instructor.</p>}{i?.courseNotes && <p className="form-note">Texto anterior conservado: {i.courseNotes}. Selecciona sus cursos del catálogo.</p>}</fieldset><label>SCTR<select name="sctr" defaultValue={i?.sctr ? 'yes' : 'no'}><option value="no">No</option><option value="yes">Sí</option></select></label><details className="car-details full-width"><summary>Auto <small>(opcional)</small></summary><div className="form-grid"><label>Modelo<input name="carModel" defaultValue={i?.carModel || ''} maxLength={200} /></label><label>Placa<input name="carPlate" defaultValue={i?.carPlate || ''} maxLength={100} /></label></div></details></>;
}
