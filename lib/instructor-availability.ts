import { classHours } from './class-hours';

export type InstructorSession = { date: Date; instructorIds?: string[]; startTime?: string | null; endTime?: string | null };
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

// Unknown hours reserve the entire day. Adjacent intervals do not overlap.
export function sessionsOverlap(a: InstructorSession, b: InstructorSession) {
  if (dayKey(a.date) !== dayKey(b.date)) return false;
  if (!classHours(a.startTime ?? '', a.endTime ?? '') || !classHours(b.startTime ?? '', b.endTime ?? '')) return true;
  return a.startTime! < b.endTime! && b.startTime! < a.endTime!;
}

export function bookedSessions(service: { serviceDate: Date | null; dates: InstructorSession[] }): InstructorSession[] {
  const sessions = [...service.dates];
  // Do not turn the legacy primary date into an all-day booking when it has hours.
  if (service.serviceDate && !sessions.some(s => dayKey(s.date) === dayKey(service.serviceDate!))) {
    sessions.push({ date: service.serviceDate });
  }
  return sessions;
}

export function conflictingDays(requested: InstructorSession[], booked: InstructorSession[]) {
  return [...new Set(requested.filter(a => booked.some(b => sessionsOverlap(a, b))).map(s => dayKey(s.date)))].sort();
}
