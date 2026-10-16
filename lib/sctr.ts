import { limaToday } from './monthly-close';

export type SctrPolicy = { sctrStartsAt: string; sctrEndsAt: string };
export type SctrSnapshot = {
  policy: SctrPolicy | null; today: string; instructorCount: number;
  status: 'UNCONFIGURED' | 'UPCOMING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  daysLeft: number | null; remindOn: string | null;
};
export const sctrStatusLabels: Record<SctrSnapshot['status'], string> = {
  UNCONFIGURED: 'Sin fechas registradas', UPCOMING: 'Por iniciar', ACTIVE: 'Vigente', EXPIRING: 'Por vencer', EXPIRED: 'Vencido',
};
export function sctrSnapshot(policy: SctrPolicy | null, instructorCount: number, now = new Date()): SctrSnapshot {
  const today = limaToday(now);
  if (!policy) return { policy, today, instructorCount, status: 'UNCONFIGURED', daysLeft: null, remindOn: null };
  const start = policy.sctrStartsAt.slice(0, 10), end = policy.sctrEndsAt.slice(0, 10);
  const daysLeft = Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
  const remindOn = new Date(Date.parse(end + 'T00:00:00Z') - 7 * 86400000).toISOString().slice(0, 10);
  const status = daysLeft < 0 ? 'EXPIRED' : start > today ? 'UPCOMING' : daysLeft <= 7 ? 'EXPIRING' : 'ACTIVE';
  return { policy, today, instructorCount, status, daysLeft, remindOn };
}
export const sctrDateLabel = (date: string) => date.slice(0, 10).split('-').reverse().join('/');
export function sctrMonthPeriod(day: string, next = false): SctrPolicy {
  const [year, month] = day.slice(0, 7).split('-').map(Number), offset = next ? 1 : 0;
  return {
    sctrStartsAt: new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10),
    sctrEndsAt: new Date(Date.UTC(year, month + offset, 0)).toISOString().slice(0, 10),
  };
}
