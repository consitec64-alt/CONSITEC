export type ServiceModality = 'VIRTUAL' | 'IN_PERSON' | 'MIXED';
export type DayModality = Exclude<ServiceModality, 'MIXED'>;
export const modalityLabels: Record<ServiceModality, string> = {
  VIRTUAL: 'Virtual',
  IN_PERSON: 'Presencial',
  MIXED: 'Virtual / Presencial'
};
export function isDayModality(value: unknown): value is DayModality {
  return value === 'VIRTUAL' || value === 'IN_PERSON';
}
export function dayModality(parent: string | null | undefined, day?: string | null): DayModality | null {
  if (isDayModality(parent)) return parent;
  return isDayModality(day) ? day : null;
}
export function modalityLabel(value: string | null | undefined) {
  return modalityLabels[value as ServiceModality] ?? 'Sin registrar';
}
