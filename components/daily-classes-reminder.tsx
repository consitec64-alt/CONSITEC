"use client";
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { useTutorial } from '@/components/dashboard-tutorial';
import { modalityLabel } from '@/lib/class-modality';
type Reminder = { day: string; classes: { id: string; company: string; courses: string[]; instructors: string[]; commercial: string; startTime: string | null; endTime: string | null; modality: string | null; location: string | null }[] };
export default function DailyClassesReminder() {
  const { active: tutorial } = useTutorial();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const dialog = useRef<HTMLDialogElement>(null), requested = useRef(false);
  useEffect(() => {
    if (tutorial || requested.current) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok || cancelled) return;
      const user = await res.json();
      if (!user.salespersonId || user.mustChangePassword || !user.tutorialCompleted || cancelled) return;
      requested.current = true;
      const result = await fetch('/api/daily-classes', { method: 'POST' });
      if (result.ok) {
        const data = await result.json();
        if (!cancelled) setReminder(data.reminder);
      }
    })().catch(() => { requested.current = false; });
    return () => { cancelled = true; };
  }, [tutorial]);
  useEffect(() => {
    const node = dialog.current;
    if (reminder && !tutorial) node?.showModal();
    return () => node?.close();
  }, [reminder, tutorial]);
  if (!reminder) return null;
  const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'full', timeZone: 'America/Lima' }).format(new Date(`${reminder.day}T12:00:00Z`));
  return <dialog ref={dialog} className="dialog daily-classes-dialog" aria-labelledby="daily-classes-title" onCancel={() => setReminder(null)}>
    <div className="section-heading"><h2 id="daily-classes-title"><CalendarDays size={20} />Clases de hoy</h2><button type="button" className="icon-button" aria-label="Cerrar recordatorio" onClick={() => setReminder(null)}><X size={20} /></button></div>
    <p>{date} · Hora de Perú</p><p className="form-note">Toda la agenda del equipo para hoy: {reminder.classes.length} {reminder.classes.length === 1 ? 'clase' : 'clases'}.</p>
    <ul className="daily-class-list">{reminder.classes.map(item => <li key={item.id}>
      <div className="split"><strong>{item.company}</strong><span>{item.startTime ? `${item.startTime}–${item.endTime || 'Por confirmar'}` : 'Horario por confirmar'}</span></div>
      <p>{item.courses.join(' · ')}</p><p>{modalityLabel(item.modality)}{item.modality !== 'VIRTUAL' && item.location ? ` · ${item.location}` : ''}</p>
      <small>Instructor: {item.instructors.join(' · ') || 'Por asignar'}<br />Comercial: {item.commercial}</small>
    </li>)}</ul>
    <div className="dialog-actions"><button type="button" className="btn" autoFocus onClick={() => setReminder(null)}>Entendido</button></div>
  </dialog>;
}
