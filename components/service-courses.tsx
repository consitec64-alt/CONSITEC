"use client";
import { useState } from 'react';
import { Meta, Service, serviceCourses } from '@/lib/ui-types';
export default function ServiceCourses({ courses, service }: { courses: Meta[]; service: Service | null }) {
  const [selected, setSelected] = useState(() => new Set(service ? serviceCourses(service).map(c => c.id) : []));
  return <fieldset className="instructor-courses full-width"><legend>Cursos del servicio</legend><p className="form-note">Selecciona uno o varios cursos. El importe es único para todas las clases.</p>{courses.map(course => <label className="checkbox-label" key={course.id}><input type="checkbox" name="courseIds" value={course.id} checked={selected.has(course.id)} onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(course.id); else next.delete(course.id); return next; })} />{course.name}</label>)}{!selected.size && <small>Selecciona al menos un curso.</small>}</fieldset>;
}
