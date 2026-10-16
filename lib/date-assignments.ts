export type DateAssignments = { courseIds?: string[]; instructorIds?: string[] };

// An empty selection inherits the service-wide selection, including older records.
export function assignedItems<T extends { id: string }>(items: T[], ids?: string[]): T[] {
  return ids?.length ? items.filter(item => ids.includes(item.id)) : items;
}
export function assignedInstructorSessions<T extends { instructorIds?: string[] }>(sessions: T[], instructorId: string): T[] {
  return sessions.filter(session => !session.instructorIds?.length || session.instructorIds.includes(instructorId));
}
export function assignmentKey(ids: string[]) { return [...ids].sort().join(','); }
