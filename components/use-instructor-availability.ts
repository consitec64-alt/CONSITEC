"use client";
import { useEffect, useState } from 'react';
import { classHours } from '@/lib/class-hours';

type Session = { date: string; startTime?: string | null; endTime?: string | null };
export function useInstructorAvailability(sessions: Session[], excludeServiceId?: string, enabled = true) {
  const [conflicts, setConflicts] = useState<Record<string, string[]>>({});
  const [error, setError] = useState(''), [checking, setChecking] = useState(false);
  const key = JSON.stringify(sessions.filter(s => s.date).map(({ date, startTime, endTime }) => ({ date, startTime, endTime })));
  useEffect(() => {
    if (!enabled) return;
    const requested = JSON.parse(key) as Session[];
    if (!requested.length || requested.some(s => (s.startTime || s.endTime) && !classHours(s.startTime || '', s.endTime || ''))) { setConflicts({}); setChecking(false); setError(''); return; }
    const controller = new AbortController(), query = new URLSearchParams();
    requested.forEach(s => { query.append('date', s.date); query.append('startTime', s.startTime || ''); query.append('endTime', s.endTime || ''); });
    if (excludeServiceId) query.set('excludeServiceId', excludeServiceId);
    setChecking(true); setError('');
    void fetch(`/api/instructors/availability?${query}`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'No se pudo comprobar disponibilidad');
      setConflicts(data.conflicts);
    }).catch(cause => { if (!controller.signal.aborted) { setConflicts({}); setError(cause instanceof Error ? cause.message : 'No se pudo comprobar disponibilidad'); } })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [key, excludeServiceId, enabled]);
  return { conflicts, checking, error };
}
