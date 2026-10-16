import { zipSync, strToU8 } from 'fflate';
import { type Service, serviceDays, serviceCoursesForDate, serviceInstructorsForDate } from '@/lib/ui-types';
import { dayModality, modalityLabel } from '@/lib/class-modality';

// Small standards-based XLSX: typed cells, one sheet, no formulas or external links.
const xml = (text: string) => text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export function serviceExportRows(services: Service[], month: number, year: number) {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const statuses: Record<string,string> = { SCHEDULED: 'Programado', EXECUTED: 'Ejecutado', INVOICED: 'Facturado', PAID: 'Pagado' };
  return services.flatMap(service => serviceDays(service).filter(date => date.startsWith(prefix)).map((date, index) => {
    const session = service.dates?.find(d => d.date.slice(0,10) === date);
    const modality = dayModality(service.modality, session?.modality);
    return { date, values: [date.split('-').reverse().join('/'), service.correlativeCode ?? '', service.company, serviceCoursesForDate(service,date).map(c => c.name ?? '').join('; '), modalityLabel(modality), session?.startTime ?? '', session?.endTime ?? '', serviceInstructorsForDate(service,date).map(i => i.name ?? '').join('; '), modality === 'VIRTUAL' ? 'Virtual' : service.location ? [service.location.department, service.location.district].filter(Boolean).join(' / ') : '', service.salesperson?.name ?? '', statuses[service.status] ?? service.status, service.certificatesOnly ? 'Certificado' : 'Capacitación', index === 0 && Number.isFinite(Number(service.amount)) ? Number(service.amount) : null] as (string | number | null)[] };
  })).sort((a,b) => a.date.localeCompare(b.date) || String(a.values[5]).localeCompare(String(b.values[5])) || String(a.values[2]).localeCompare(String(b.values[2])));
}
export function servicesWorkbook(services: Service[], month: number, year: number) {
  const headers = ['Fecha', 'Correlativo', 'Empresa', 'Curso(s)', 'Modalidad', 'Inicio', 'Fin', 'Instructor(es)', 'Lugar', 'Comercial', 'Estado', 'Tipo', 'Importe del servicio (una vez)'];
  const values: (string | number | boolean | null)[][] = [headers, ...serviceExportRows(services, month, year).map(row => row.values)];
  const sheetRows = values.map((row, index) => `<row r="${index + 1}">${row.map((value, column) => {
    const ref = `${String.fromCharCode(65 + column)}${index + 1}`;
    if (value === null) return `<c r="${ref}"/>`;
    if (typeof value === 'number') return `<c r="${ref}" s="1"><v>${value}</v></c>`;
    if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const entries = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Calendario de servicios" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="2" width="22" customWidth="1"/><col min="3" max="12" width="32" customWidth="1"/><col min="13" max="13" width="18" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:M${values.length}"/></worksheet>`
  };
  return zipSync(Object.fromEntries(Object.entries(entries).map(([name, content]) => [name, strToU8(content)])), { level: 6 });
}
