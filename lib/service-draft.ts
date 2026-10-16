export type DraftValues = Record<string, string | string[]>;
export type ServiceDraft = { values: DraftValues; updatedAt: string };
export type DraftSession = { date: string; startTime: string; endTime: string; modality: string; courseIds?: string[]; instructorIds?: string[] };
const fields = ['company','salespersonId','correlativeCode','courseIds','instructorIds','sessions','modality','locationId','invoiceDate','travelMode','amount','status','certificatesOnly'];
export function draftSessions(value: unknown): DraftSession[] | null {
  if (typeof value !== 'string') return null;
  try {
    const rows = JSON.parse(value);
    const validIds = (ids: unknown) => ids === undefined || (Array.isArray(ids) && ids.length <= 100 && ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 100));
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 366 || rows.some(row => !row || ['date','startTime','endTime','modality'].some(key => typeof row[key] !== 'string' || row[key].length > 40) || !validIds(row.courseIds) || !validIds(row.instructorIds))) return null;
    return rows.map(row => ({date:row.date,startTime:row.startTime,endTime:row.endTime,modality:row.modality,...(row.courseIds ? {courseIds:[...new Set(row.courseIds)] as string[]} : {}),...(row.instructorIds ? {instructorIds:[...new Set(row.instructorIds)] as string[]} : {})}));
  } catch { return null; }
}
export function validateDraft(value: unknown): DraftValues {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Borrador inválido');
  const result: DraftValues = {};
  for (const [name, content] of Object.entries(value)) {
    if (!fields.includes(name)) throw Error('Campo de borrador desconocido');
    if (['courseIds','instructorIds'].includes(name)) {
      if (!Array.isArray(content) || content.length > 100 || content.some(id => typeof id !== 'string' || id.length > 100)) throw Error('Selección inválida');
      result[name] = [...new Set(content)] as string[];
    } else {
      if (typeof content !== 'string' || content.length > (name === 'sessions' ? 65536 : 1000)) throw Error('Campo de borrador inválido');
      if (name === 'sessions' && !draftSessions(content)) throw Error('Fechas de borrador inválidas');
      result[name] = content;
    }
  }
  return result;
}
export function draftFromForm(form: HTMLFormElement): DraftValues {
  const data = new FormData(form), values: DraftValues = {};
  for (const name of fields) values[name] = ['courseIds','instructorIds'].includes(name) ? data.getAll(name).map(String) : String(data.get(name) ?? '');
  return values;
}
