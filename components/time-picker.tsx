"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { Clock3, ChevronDown } from 'lucide-react';
import { useTutorial } from '@/components/dashboard-tutorial';

const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
export default function TimePicker({ name, value, onChange, label }: { name: string; value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false), [invalid, setInvalid] = useState(false);
  const popupId = useId();
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null);
  const { active: tutorial } = useTutorial();
  const hasSavedMinutes = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value) && !value.endsWith(':00');
  const hour = Number(value.slice(0, 2)) || 0, minute = Number(value.slice(3, 5)) || 0;
  function close() { setOpen(false); trigger.current?.focus(); }
  useEffect(() => {
    if (tutorial) setOpen(name === 'startTime' && tutorial.target.includes('.clock-popup'));
  }, [tutorial, name]);
  useEffect(() => {
    if (!open) return;
    const node = root.current;
    const outside = (event: PointerEvent) => { if (!node?.contains(event.target as Node)) setOpen(false); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    node?.addEventListener('keydown', keyboard);
    document.addEventListener('pointerdown', outside);
    popup.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    return () => { node?.removeEventListener('keydown', keyboard); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  return <div className="time-picker-control" data-time-kind={name} ref={root} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
    <button ref={trigger} type="button" className="clock-trigger" aria-label={`Elegir hora de ${label}${value ? `, ${value}` : ''}`} aria-expanded={open} aria-controls={open ? popupId : undefined} onClick={() => setOpen(v => !v)}><Clock3 size={18} aria-hidden="true"/><span>{value || 'Elige hora'}</span><ChevronDown size={15} aria-hidden="true"/></button>
    <select className="time-picker-native" name={name} aria-label={label} aria-hidden="true" tabIndex={-1} value={value} required onChange={e => { onChange(e.target.value); setInvalid(false); }} onInvalid={e => { e.preventDefault(); setInvalid(true); setOpen(true); trigger.current?.focus(); }}>
      <option value="" disabled>Elige hora</option>{hasSavedMinutes && <option value={value} disabled>{value} (guardada)</option>}{hours.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
    {open && <div id={popupId} ref={popup} className="clock-popup" role="group" aria-label={`Reloj de ${label}`}>
      <div className="clock-display"><svg className="clock-face" viewBox="0 0 160 160" role="img" aria-label={value ? `Reloj: ${value}` : 'Reloj sin hora elegida'}><circle className="clock-rim" cx="80" cy="80" r="73"/><circle className="clock-dial" cx="80" cy="80" r="65"/>{Array.from({ length: 12 }, (_, i) => { const n = i + 1, angle = n * Math.PI / 6; return <text key={n} x={80 + 52 * Math.sin(angle)} y={80 - 52 * Math.cos(angle)} textAnchor="middle" dominantBaseline="central">{n}</text>; })}<line className="clock-minute-hand" x1="80" y1="80" x2="80" y2="31" transform={`rotate(${minute * 6} 80 80)`}/><line className="clock-hour-hand" x1="80" y1="80" x2="80" y2="48" transform={`rotate(${hour * 30 + minute / 2} 80 80)`}/><circle className="clock-pin" cx="80" cy="80" r="5"/></svg><div className="clock-digital"><strong aria-live="polite">{value || '—:—'}</strong><small>Formato de 24 h</small></div></div>
      <p>Elige una hora completa</p>
      <div className="clock-hour-grid">{hours.map(h => <button type="button" key={h} className={value === h ? 'selected' : ''} aria-label={`Elegir ${h}, ${label}`} aria-pressed={value === h} onClick={() => { onChange(h); setInvalid(false); }}>{h.slice(0, 2)}</button>)}</div>
      {hasSavedMinutes && <small>Horario anterior conservado. Una nueva selección usará minutos 00.</small>}
      {invalid && <small role="alert">Elige una hora para continuar.</small>}
      <button type="button" className="btn secondary clock-done" onClick={close}>Listo</button>
    </div>}
  </div>;
}
