"use client";
import { useRef, useState } from 'react';
import { ChevronDown, FileSpreadsheet } from 'lucide-react';
import type { Meta } from '@/lib/ui-types';
import { expectedImportMonth, importDate, importNames, importRowsOverlap, importServiceBody, matchingCatalogId, normalizeImportName, validateImportRow, type PreparedImportRow, type ServiceWorkbook } from '@/lib/service-import';

type Props = { hidden: boolean; disabled: boolean; courses: Meta[]; instructors: Meta[]; salespeople: Meta[]; isAdmin: boolean; assignedRep: Meta | null; onDone: () => Promise<void> };
type Edit = Partial<Pick<PreparedImportRow, 'company' | 'date' | 'hours' | 'startTime' | 'endTime' | 'modality' | 'place'>>;
type Result = { state: 'done' | 'error'; message: string; code?: string };
const mapKey = (kind: string, name: string) => `${kind}:${normalizeImportName(name)}`;
export default function ServiceExcelImport({ hidden, disabled, courses, instructors, salespeople, isAdmin, assignedRep, onDone }: Props) {
  const [workbook, setWorkbook] = useState<ServiceWorkbook | null>(null), [filename, setFilename] = useState('');
  const [sheetId, setSheetId] = useState(0), [year, setYear] = useState(''), [commercial, setCommercial] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({}), [edits, setEdits] = useState<Record<string, Edit>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({}), [results, setResults] = useState<Record<string, Result>>({}), [confirmedDuplicates, setConfirmedDuplicates] = useState<Record<string, boolean>>({});
  const [parsing, setParsing] = useState(false), [importing, setImporting] = useState(false), [catalogBusy, setCatalogBusy] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [progress, setProgress] = useState('');
  const stop = useRef(false);
  const locked = disabled || parsing || importing || !!catalogBusy, noCommercial = !isAdmin && !assignedRep;
  const sheet = workbook?.sheets.find(item => item.id === sheetId);
  const resolve = (kind: 'course' | 'instructor', name: string) => { const items = kind === 'course' ? courses : instructors; const id = mapping[mapKey(kind, name)] ?? matchingCatalogId(name, items); return items.some(item => item.id === id) ? id : ''; };
  const baseRows = (sheet?.rows || []).map(source => {
    const id = `${sheet!.id}:${source.row}:${year}`, changed = edits[id] || {}, date = changed.date ?? importDate(source.date, Number(year), sheet!.date1904);
    const modality = normalizeImportName(source.modality) === 'VIRTUAL' ? 'VIRTUAL' : normalizeImportName(source.modality) === 'PRESENCIAL' ? 'IN_PERSON' : '';
    return validateImportRow({ id, key: `excel:${workbook!.fingerprint}:${sheet!.id}:${source.row}:${date.slice(0,4) || year}`, source, company: source.company, date, hours: source.hours, startTime: '', endTime: '', modality, place: source.place.trim() === '-' ? '' : source.place.trim(), ...changed,
      courseIds: importNames(source.course).map(name => resolve('course', name)), instructorIds: importNames(source.instructor).map(name => resolve('instructor', name)) }, expectedImportMonth(source.month, sheet!.name));
  });
  const selection = Object.fromEntries(baseRows.map(row => [row.id, results[row.id]?.state !== 'done' && (selected[row.id] ?? (!row.errors.length && !row.warnings.length))]));
  const isSelected = (row: PreparedImportRow) => !!selection[row.id];
  const rows = baseRows.map(row => {
    const errors = [...row.errors];
    if (isSelected(row) && baseRows.some(other => other.id !== row.id && isSelected(other) && importRowsOverlap(row, other))) errors.push('Coincide con otra fila seleccionada del mismo instructor. Completa horarios que no se crucen o desmarca una fila.');
    return { ...row, errors };
  });
  const picked = rows.filter(isSelected), bad = picked.filter(row => row.errors.length || results[row.id]?.state === 'error');
  const names = (kind: 'course' | 'instructor') => [...new Map((sheet?.rows || []).flatMap(row => importNames(row[kind]).map(name => [normalizeImportName(name), name] as const))).values()];
  const unresolved = names('course').filter(name => !resolve('course', name)).length + names('instructor').filter(name => !resolve('instructor', name)).length;
  function edit(id: string, key: keyof Edit, value: string) {
    setEdits(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } }));
    setResults(previous => { const next = { ...previous }; delete next[id]; return next; });
    setConfirmedDuplicates(previous => { const next = { ...previous }; delete next[id]; return next; });
  }
  async function read(file: File) {
    if (locked) return;
    setParsing(true); setWorkbook(null); setError(''); setNotice(''); setFilename(file.name); setYear(''); setMapping({}); setEdits({}); setSelected({}); setResults({}); setConfirmedDuplicates({});
    try { const { readServiceWorkbook } = await import('@/lib/service-import-reader'); const value = await readServiceWorkbook(file); setWorkbook(value); setSheetId(value.sheets[0].id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo leer el Excel'); }
    finally { setParsing(false); }
  }
  async function createCatalog(kind: 'course' | 'instructor', name: string) {
    if (locked || resolve(kind, name)) return;
    const key = mapKey(kind, name); setCatalogBusy(key); setError('');
    try {
      const response = await fetch(`/api/metadata/${kind === 'course' ? 'courses' : 'instructors'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (response.status === 401) { window.location.assign('/login'); return; }
      const data = await response.json(); if (!response.ok) throw Error(data.error || 'No se pudo crear el registro');
      setMapping(previous => ({ ...previous, [key]: data.id })); await onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear el registro'); }
    finally { setCatalogBusy(''); }
  }
  async function importSelected() {
    if (locked || noCommercial || !year || !picked.length || bad.length) return;
    const batch = [...picked]; stop.current = false; setImporting(true); setError(''); setNotice(''); let processed = 0, failed = 0;
    try {
      for (const [index, row] of batch.entries()) {
        if (stop.current) break;
        setProgress(`Procesando ${index + 1} de ${batch.length} · fila ${row.source.row}`);
        try {
          const response = await fetch('/api/services/import', { method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(importServiceBody(row, commercial, !!confirmedDuplicates[row.id])) });
          if (response.status === 401) { stop.current = true; window.location.assign('/login'); break; }
          const data = await response.json();
          if (!response.ok) { failed++; setResults(previous => ({ ...previous, [row.id]: { state: 'error', message: data.error || 'No se pudo importar esta fila', code: data.code } })); continue; }
          processed++; setResults(previous => ({ ...previous, [row.id]: { state: 'done', message: data.alreadyImported ? 'Ya registrada; se conservan los datos existentes.' : 'Registrada' } }));
        } catch { failed++; setResults(previous => ({ ...previous, [row.id]: { state: 'error', message: 'No se pudo confirmar el guardado. Reintenta esta fila; el mismo archivo y fila se registran una sola vez.' } })); }
      }
      setNotice(`${processed} filas procesadas correctamente${failed ? ` · ${failed} por revisar` : ''}${stop.current ? ' · importación detenida' : ''}.`); await onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la agenda'); }
    finally { setImporting(false); setProgress(''); }
  }
  return <details hidden={hidden} className="panel service-excel-import">
    <summary><span><FileSpreadsheet size={22} aria-hidden="true" /><span><strong>Importar Excel</strong><small>Carga y revisa los servicios antes de registrarlos.</small></span></span><ChevronDown size={20} aria-hidden="true" /></summary>
    <div className="service-import-content">
      <p className="form-note">Cada fila se registra como un servicio con su fecha y todos sus cursos. El importe inicial será S/0 para completarlo después. La duración de HORAS se conserva; la disponibilidad de la agenda se comprueba al guardar.</p>
      <fieldset disabled={locked} className="form-grid import-controls">
        <label className="full-width">Archivo Excel (.xlsx o .xlsm, máximo 5 MB)<input type="file" accept=".xlsx,.xlsm" onChange={event => { const file = event.target.files?.[0]; if (file) void read(file); event.target.value = ''; }} /></label>
        {workbook && <><label>Hoja<select value={sheetId} onChange={event => setSheetId(Number(event.target.value))}>{workbook.sheets.map(item => <option key={item.id} value={item.id}>{item.name} ({item.rows.length} filas)</option>)}</select></label><label>Año de las fechas<select value={year} onChange={event => setYear(event.target.value)}><option value="">Selecciona el año</option>{Array.from({ length: 101 }, (_, i) => 2000 + i).map(value => <option key={value}>{value}</option>)}</select></label><p className="form-note full-width">El año se aplica a fechas sin año. Las fechas completas del Excel conservan su año original. Al seleccionar filas con advertencias confirmas que revisaste sus datos.</p></>}
        {isAdmin ? <label>Comercial para la importación<select value={commercial} onChange={event => setCommercial(event.target.value)}><option value="">Sin asignar</option>{salespeople.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label> : <div className="assigned-commercial"><span>Comercial asignado</span><strong>{assignedRep?.name || 'Sin asignar'}</strong></div>}
      </fieldset>
      {parsing && <p role="status">Leyendo el archivo…</p>}{error && <p className="error-banner" role="alert">{error}</p>}{notice && <p role="status" className="service-import-notice">{notice}</p>}
      {noCommercial && <p role="alert" className="error-banner">Un administrador debe asignarte un comercial en Usuarios antes de importar servicios.</p>}
      {workbook && <><p className="form-note">{filename} · {sheet?.rows.length || 0} filas en esta hoja. Las hojas auxiliares sin columnas de servicios se omiten.</p>
        <details className="import-mapping" open={unresolved > 0}><summary>Revisar catálogo · {unresolved ? `${unresolved} nombres por resolver` : 'nombres reconocidos'}</summary><p className="form-note">Selecciona el registro correspondiente. Crear añade un nuevo registro al catálogo antes de importar.</p><div className="import-mapping-list">{(['course','instructor'] as const).map(kind => names(kind).map(name => <div key={mapKey(kind,name)} className="import-map-row"><label>{kind === 'course' ? 'Curso' : 'Instructor'}: {name}<select disabled={locked} aria-label={`${kind === 'course' ? 'Curso' : 'Instructor'}: ${name}`} value={resolve(kind,name)} onChange={event => { const value = event.target.value; setMapping(previous => ({ ...previous, [mapKey(kind,name)]: value })); setConfirmedDuplicates({}); setResults(previous => Object.fromEntries(Object.entries(previous).filter(([, result]) => result.state === 'done'))); }}><option value="">Selecciona del catálogo</option>{(kind === 'course' ? courses : instructors).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{!resolve(kind,name) && <button type="button" className="btn secondary" disabled={locked || name.length > 200} onClick={() => void createCatalog(kind,name)}>Crear {kind === 'course' ? 'curso' : 'instructor'}</button>}</div>))}</div></details>
        {year && <><div className="import-selection"><strong>{picked.length} seleccionadas · {bad.length} requieren revisión</strong><button type="button" className="text-button" disabled={locked} onClick={() => setSelected(previous => ({ ...previous, ...Object.fromEntries(rows.map(row => [row.id, !row.errors.length && results[row.id]?.state !== 'done' && results[row.id]?.state !== 'error'])) }))}>Seleccionar filas listas</button><button type="button" className="text-button" disabled={locked} onClick={() => setSelected(previous => ({ ...previous, ...Object.fromEntries(rows.map(row => [row.id,false])) }))}>Desmarcar todas</button></div>
          <div className="table-scroll service-import-preview" role="region" tabIndex={0} aria-label="Vista previa del Excel"><table><thead><tr>{['Incluir','Fila / resultado','Empresa','Curso(s)','Instructor(es)','Fecha','Modalidad','Lugar','Horas del Excel','Inicio (24 h)','Fin (24 h)'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{rows.map(row => { const result = results[row.id], frozen = locked || result?.state === 'done'; return <tr key={row.id} className={result?.state === 'done' ? 'import-done' : row.errors.length || result?.state === 'error' ? 'import-invalid' : ''}>
            <td><input type="checkbox" aria-label={`Incluir fila ${row.source.row}`} checked={isSelected(row)} disabled={frozen} onChange={event => setSelected(previous => ({ ...previous, [row.id]: event.target.checked }))} /></td>
            <td><strong>Fila {row.source.row}</strong>{row.errors.map(message => <p className="import-row-error" key={message}>{message}</p>)}{row.warnings.map(message => <p className="import-row-warning" key={message}>{message}</p>)}{result && <p className={result.state === 'error' ? 'import-row-error' : ''}>{result.message}</p>}{result?.state === 'error' && <button type="button" className="text-button" disabled={locked || (result.code === 'POSSIBLE_DUPLICATE' && !!row.errors.length)} onClick={() => { setResults(previous => { const next = { ...previous }; delete next[row.id]; return next; }); if (result.code === 'POSSIBLE_DUPLICATE') setConfirmedDuplicates(previous => ({ ...previous, [row.id]: true })); }}>{result.code === 'POSSIBLE_DUPLICATE' ? 'Confirmar que es otro servicio' : 'Revisar y reintentar'}</button>}{confirmedDuplicates[row.id] && <small>Duplicado revisado: se registrará como otro servicio.</small>}</td>
            <td><input aria-label={`Empresa fila ${row.source.row}`} disabled={frozen} value={row.company} maxLength={200} onChange={event => edit(row.id,'company',event.target.value)} /></td><td>{importNames(row.source.course).join(' · ') || 'Falta curso'}</td><td>{importNames(row.source.instructor).join(' · ') || 'Falta instructor'}</td>
            <td><input type="date" aria-label={`Fecha fila ${row.source.row}`} disabled={frozen} value={row.date} onChange={event => edit(row.id,'date',event.target.value)} /><small>Excel: {String(row.source.date || 'Sin fecha')}</small></td>
            <td><select aria-label={`Modalidad fila ${row.source.row}`} disabled={frozen} value={row.modality} onChange={event => edit(row.id,'modality',event.target.value)}><option value="">Selecciona</option><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">Presencial</option></select></td>
            <td><input aria-label={`Lugar fila ${row.source.row}`} disabled={frozen} maxLength={200} value={row.place} onChange={event => edit(row.id,'place',event.target.value)} /></td>
            <td><input type="number" min="0" max="24" step="any" aria-label={`Horas fila ${row.source.row}`} disabled={frozen} value={row.hours} onChange={event => edit(row.id,'hours',event.target.value)} /></td>
            <td><input type="time" aria-label={`Inicio fila ${row.source.row}`} disabled={frozen} value={row.startTime} onChange={event => edit(row.id,'startTime',event.target.value)} /></td><td><input type="time" aria-label={`Fin fila ${row.source.row}`} disabled={frozen} value={row.endTime} onChange={event => edit(row.id,'endTime',event.target.value)} /></td>
          </tr>; })}</tbody></table></div>
          <p className="form-note">Sin inicio y fin se reserva el día completo. Si un instructor tiene varias clases en una fecha, completa horarios que no se crucen. Los horarios reales sustituyen la duración del Excel y aplican el descanso habitual.</p>
        </>}
        <div className="service-import-actions"><span role="status">{progress}</span>{importing ? <button type="button" className="btn secondary" onClick={() => { stop.current = true; }}>Detener después de esta fila</button> : <button type="button" className="btn" disabled={locked || noCommercial || !year || !picked.length || !!bad.length} onClick={() => void importSelected()}>Importar {picked.length} filas seleccionadas</button>}</div>
      </>}
    </div>
  </details>;
}
