import { classHours } from './class-hours';
import type { Meta } from './ui-types';
export type RawServiceRow = { row: number; month: string; instructor: string; company: string; course: string; modality: string; place: string; date: string | number; hours: string };
export type ImportSheet = { id: number; name: string; rows: RawServiceRow[]; date1904: boolean };
export type ServiceWorkbook = { fingerprint: string; sheets: ImportSheet[] };
export const normalizeImportName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('es');
export const importNames = (value: string) => [...new Set(value.split(/[\n;]+/).map(name => name.trim()).filter(Boolean))];
export function matchingCatalogId(name: string, items: Meta[]) {
  const matches = items.filter(item => normalizeImportName(item.name || '') === normalizeImportName(name));
  return matches.length === 1 ? matches[0].id : '';
}
export function importDate(value: string | number, year: number, date1904 = false) {
  let result = '';
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 100000) result = new Date(Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) + Math.floor(value) * 86400000).toISOString().slice(0, 10);
  else {
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text)) result = text.slice(0, 10);
    else {
      const match = /^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}))?$/.exec(text);
      if (match && (match[3] || year)) result = `${match[3] || year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
  }
  const parsed = new Date(result + 'T00:00:00Z');
  return result && Number(result.slice(0,4)) >= 2000 && Number(result.slice(0,4)) <= 2100 && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === result ? result : '';
}
export function importedMinutes(hours: string) {
  if (!hours.trim()) return null;
  const amount = Number(hours.replace(',', '.')) * 60;
  return Number.isFinite(amount) && Math.abs(amount - Math.round(amount)) < 0.000001 && amount >= 1 && amount <= 1440 ? Math.round(amount) : NaN;
}
const monthNames = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
export function expectedImportMonth(month: string, sheet: string) {
  const text = normalizeImportName(month || sheet).replace('SETIEMBRE', 'SEPTIEMBRE');
  const index = monthNames.findIndex(name => text.includes(name));
  return index < 0 ? null : index + 1;
}
export type PreparedImportRow = { id: string; key: string; source: RawServiceRow; company: string; date: string; hours: string; startTime: string; endTime: string; modality: string; courseIds: string[]; instructorIds: string[]; place: string; errors: string[]; warnings: string[] };
export function validateImportRow(row: Omit<PreparedImportRow, 'errors' | 'warnings'>, expectedMonth: number | null): PreparedImportRow {
  const errors: string[] = [], warnings: string[] = [];
  if (!row.company.trim() || row.company.trim().length > 200) errors.push('Completa la empresa (máximo 200 caracteres).');
  if (!row.date) errors.push('Completa una fecha válida.');
  if (!row.courseIds.length || row.courseIds.some(id => !id)) errors.push('Resuelve los cursos en el catálogo.');
  if (!row.instructorIds.length || row.instructorIds.some(id => !id)) errors.push('Resuelve los instructores en el catálogo.');
  if (!['VIRTUAL','IN_PERSON'].includes(row.modality)) errors.push('Selecciona Virtual o Presencial.');
  if (row.place.length > 200) errors.push('El lugar admite hasta 200 caracteres.');
  const minutes = importedMinutes(row.hours), hours = classHours(row.startTime, row.endTime);
  if (Number.isNaN(minutes)) errors.push('La duración debe ser entre 1 minuto y 24 horas.');
  if ((row.startTime || row.endTime) && !hours) errors.push('Completa inicio y fin; el fin debe ser posterior al inicio.');
  if (row.date && expectedMonth && Number(row.date.slice(5,7)) !== expectedMonth) warnings.push('La fecha no coincide con el mes de la hoja. Revisa antes de seleccionar.');
  if (hours && minutes != null && hours.instructionalMinutes !== minutes) warnings.push('El horario cambia las horas del Excel; se usará la duración calculada, descontando el descanso habitual.');
  return { ...row, errors, warnings };
}
export function importRowsOverlap(a: PreparedImportRow, b: PreparedImportRow) {
  return a.date && a.date === b.date && a.instructorIds.some(id => id && b.instructorIds.includes(id)) && ((!a.startTime || !a.endTime || !b.startTime || !b.endTime) || (a.startTime < b.endTime && b.startTime < a.endTime));
}
export function importServiceBody(row: PreparedImportRow, salespersonId: string, allowDuplicate = false) {
  return { company: row.company.trim(), courseIds: [...new Set(row.courseIds)], instructorIds: [...new Set(row.instructorIds)], modality: row.modality, amount: 0, salespersonId,
    importedLocation: row.place || null, importKey: row.key, allowDuplicate,
    sessions: [{ date: row.date, startTime: row.startTime, endTime: row.endTime, modality: row.modality, reportedInstructionalMinutes: row.startTime || row.endTime ? null : importedMinutes(row.hours) }] };
}
