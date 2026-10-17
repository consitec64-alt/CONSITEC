import { Unzip, UnzipInflate, strFromU8 } from 'fflate';
import type { RawServiceRow, ServiceWorkbook } from './service-import';
import { normalizeImportName } from './service-import';
const tags = (node: Document | Element, name: string) => [...node.getElementsByTagNameNS('*', name)];
function documentOf(bytes: Uint8Array) {
  const text = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('El Excel contiene XML no compatible. Guarda una copia .xlsx e inténtalo nuevamente.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (tags(doc, 'parsererror').length) throw Error('No se pudo leer el contenido del Excel.');
  return doc;
}
function unzipWorkbook(bytes: Uint8Array) {
  const entries: Record<string, Uint8Array> = {}; let total = 0, files = 0, failure: Error | null = null;
  const unzip = new Unzip(file => {
    if (++files > 300) { failure = Error('El Excel contiene demasiados archivos internos.'); return; }
    if (!/^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[\w-]+\.xml)$/.test(file.name)) return;
    const chunks: Uint8Array[] = []; let size = 0;
    file.ondata = (error, data, final) => {
      if (error) { failure = error; return; }
      size += data.length; total += data.length;
      if (size > 8 * 1024 * 1024 || total > 24 * 1024 * 1024) { failure = Error('El contenido del Excel es demasiado grande. Importa una copia con menos filas.'); file.terminate(); return; }
      chunks.push(data);
      if (final) { const output = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; } entries[file.name] = output; }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < bytes.length; offset += 4096) { unzip.push(bytes.subarray(offset, offset + 4096), offset + 4096 >= bytes.length); if (failure) throw failure; }
  return entries;
}
export async function readServiceWorkbook(file: File): Promise<ServiceWorkbook> {
  if (!/\.(xlsx|xlsm)$/i.test(file.name)) throw Error('Selecciona un archivo .xlsx o .xlsm.');
  if (file.size > 5 * 1024 * 1024) throw Error('El Excel debe pesar como máximo 5 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = unzipWorkbook(bytes);
  if (!entries['xl/workbook.xml'] || !entries['xl/_rels/workbook.xml.rels']) throw Error('No se reconoce este Excel. Guarda una copia .xlsx e inténtalo nuevamente.');
  const fingerprint = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2,'0')).join('');
  const workbook = documentOf(entries['xl/workbook.xml']), relationships = documentOf(entries['xl/_rels/workbook.xml.rels']);
  const shared = entries['xl/sharedStrings.xml'] ? tags(documentOf(entries['xl/sharedStrings.xml']), 'si').map(si => tags(si, 't').map(t => t.textContent || '').join('')) : [];
  const date1904 = ['1','true'].includes(tags(workbook, 'workbookPr')[0]?.getAttribute('date1904') || '');
  const sheets: ServiceWorkbook['sheets'] = [];
  const aliases: Record<string, keyof Omit<RawServiceRow, 'row'>> = { MES:'month', INSTRUCTOR:'instructor', INSTRUCTORES:'instructor', EMPRESA:'company', CLIENTE:'company', EMPRESACLIENTE:'company', CURSO:'course', CURSOS:'course', MODALIDAD:'modality', LUGAR:'place', UBICACION:'place', DIAMES:'date', FECHA:'date', FECHASERVICIO:'date', HORAS:'hours', DURACION:'hours' };
  for (const [index, sheet] of tags(workbook, 'sheet').entries()) {
    const relationId = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const relation = tags(relationships, 'Relationship').find(r => r.getAttribute('Id') === relationId && r.getAttribute('TargetMode') !== 'External');
    const target = relation?.getAttribute('Target') || '', path = target.startsWith('/') ? target.slice(1) : 'xl/' + target;
    if (!entries[path] || !/^xl\/worksheets\/[\w-]+\.xml$/.test(path)) continue;
    const source = tags(documentOf(entries[path]), 'row');
    const cells = (row: Element) => tags(row, 'c').flatMap(cell => {
      const column = /^[A-Z]+/.exec(cell.getAttribute('r') || '')?.[0] || '';
      if (!/^[A-Z]{1,2}$/.test(column)) return [];
      const raw = tags(cell, 'v')[0]?.textContent || '', type = cell.getAttribute('t');
      const value = type === 's' ? shared[Number(raw)] || '' : type === 'inlineStr' ? tags(cell, 't').map(t => t.textContent || '').join('') : (!type || type === 'n') && raw && Number.isFinite(Number(raw)) ? Number(raw) : raw;
      return [{ column, value }];
    });
    let header = -1, columns: Record<string, keyof Omit<RawServiceRow, 'row'>> = {};
    for (let i = 0; i < Math.min(20, source.length); i++) {
      const candidate = Object.fromEntries(cells(source[i]).flatMap(cell => { const key = aliases[normalizeImportName(String(cell.value)).replace(/[^A-Z0-9]/g,'')]; return key ? [[cell.column, key]] : []; }));
      if (['company','course','instructor','date'].every(key => Object.values(candidate).some(value => value === key))) { header = i; columns = candidate; break; }
    }
    if (header < 0) continue;
    const rows: RawServiceRow[] = [];
    for (const row of source.slice(header + 1)) {
      const values = Object.fromEntries(cells(row).filter(cell => columns[cell.column]).map(cell => [columns[cell.column], cell.value]));
      if (!['company','course','instructor','date'].some(key => String(values[key] ?? '').trim())) continue;
      rows.push({ row: Number(row.getAttribute('r')), month: String(values.month || ''), instructor: String(values.instructor || ''), company: String(values.company || ''), course: String(values.course || ''), modality: String(values.modality || ''), place: String(values.place || ''), date: values.date ?? '', hours: String(values.hours ?? '') });
      if (rows.length > 500) throw Error('Cada hoja admite hasta 500 filas de servicios. Divide la hoja e inténtalo nuevamente.');
    }
    sheets.push({ id: index, name: sheet.getAttribute('name') || `Hoja ${index + 1}`, rows, date1904 });
  }
  if (!sheets.length) throw Error('No se encontraron columnas de Empresa, Curso, Instructor y Día - Mes o Fecha.');
  return { fingerprint, sheets };
}
