'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { Search, Check, ChevronDown, X, BookOpen, Building2, CalendarDays, ImageIcon } from 'lucide-react';
import s from './courses.module.css';

const courses = [
  { id:'height', name:'Trabajo en altura', category:'Seguridad y prevención', image:0 },
  { id:'safety', name:'Seguridad industrial', category:'Seguridad y prevención', image:1 },
  { id:'confined', name:'Espacios confinados', category:'Seguridad y prevención', image:2 },
  { id:'forklift', name:'Operación de montacargas', category:'Operación de equipos', image:3 },
  { id:'hotwork', name:'Trabajos en caliente', category:'Seguridad y prevención', image:4 },
  { id:'fire', name:'Uso y manejo de extintores', category:'Seguridad y prevención', image:5 },
];
const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const picture=(index:number)=>({backgroundPosition:`${index%3*50}% ${index>2?100:0}%`} as CSSProperties);

export default function CoursePickerPreview() {
  const [kind,setKind]=useState<'service'|'certificate'>('service');
  const [open,setOpen]=useState(true),[selected,setSelected]=useState<string[]>(['height']);
  const [query,setQuery]=useState(''),[notice,setNotice]=useState(false);
  const search=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const matches=courses.filter(course=>normalize(course.name).includes(normalize(query.trim())));
  const chosen=courses.filter(course=>selected.includes(course.id));
  const toggle=(id:string)=>setSelected(previous=>previous.includes(id)?previous.filter(value=>value!==id):[...previous,id]);
  const close=()=>{setOpen(false);trigger.current?.focus();};
  return <main className={s.screen}>
    <header className={s.topbar}><div className={s.brand}><span>C<b>›</b></span><strong>CONSITEC</strong><i /><small>Catálogo de cursos</small></div><span className={s.previewBadge}><i />PREVIEW</span></header>
    <div className={s.workspace}>
      <div className={s.pageHeading}><div><p className={s.eyebrow}>UNA SELECCIÓN MÁS VISUAL</p><h1>Encuentra el curso de un vistazo.</h1><p>Nombre, imagen y búsqueda en el mismo selector.</p></div><div className={s.mode} aria-label="Tipo de registro"><button type="button" aria-pressed={kind==='service'} onClick={()=>setKind('service')}>Servicio</button><button type="button" aria-pressed={kind==='certificate'} onClick={()=>setKind('certificate')}>Venta de certificado</button></div></div>
      <section className={s.window} aria-labelledby="form-title">
        <header className={s.windowHeader}><div className={s.windowIcon}><BookOpen size={21}/></div><div><h2 id="form-title">{kind==='service'?'Nuevo servicio':'Venta de certificado'}</h2><p>Selecciona uno o varios cursos para tu registro.</p></div><span className={s.stepIndicator}>SELECCIÓN DE CURSOS</span></header>
        <div className={s.windowBody}>
          <div className={s.form}>
            <div className={s.client}><span><Building2 size={16}/>EMPRESA / CLIENTE</span><strong>Constructora Andina S.A.C.</strong><small>Datos de ejemplo</small></div>
            <div className={s.sectionHeading}><span>02</span><div><h3>Cursos incluidos</h3><p>Todos los cursos seleccionados comparten un solo importe.</p></div></div>
            <div className={s.selected} aria-label="Cursos seleccionados">{chosen.length?chosen.map(course=><span className={s.chip} key={course.id}><Check size={12}/>{course.name}<button type="button" aria-label={`Quitar ${course.name}`} onClick={()=>toggle(course.id)}><X size={13}/></button></span>):<span className={s.noSelection}>Todavía no has seleccionado cursos.</span>}</div>
            <button ref={trigger} className={`${s.trigger} ${open?s.expanded:''}`} type="button" aria-expanded={open} aria-controls="course-panel" onClick={()=>setOpen(previous=>!previous)}><span><BookOpen size={16}/>{open?'Catálogo de cursos':chosen.length?`${chosen.length} curso${chosen.length===1?'':'s'} seleccionado${chosen.length===1?'':'s'}`:'Seleccionar cursos'}</span><ChevronDown size={17}/></button>
            {open&&<section className={s.panel} id="course-panel" aria-label="Catálogo de cursos" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close();}}}>
              <div className={s.searchBar}><Search size={18} aria-hidden="true"/><label className={s.srOnly} htmlFor="course-search">Buscar cursos</label><input id="course-search" type="search" ref={search} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por nombre del curso…" autoComplete="off"/>{query&&<button type="button" aria-label="Limpiar búsqueda" onClick={()=>{setQuery('');search.current?.focus();}}><X size={15}/></button>}</div>
              <div className={s.resultLine}><span>{query?`${matches.length} resultado${matches.length===1?'':'s'}`:`${courses.length} cursos disponibles`}</span><span>Elige uno o varios</span></div>
              <div className={s.courseList}><div className={s.grid}>{matches.map(course=>{const checked=selected.includes(course.id);return <label key={course.id} className={`${s.card} ${checked?s.checked:''}`}><input type="checkbox" checked={checked} onChange={()=>toggle(course.id)} aria-label={course.name}/><div className={s.thumbnail} aria-hidden="true"><div className={s.photo} style={picture(course.image)}/><span className={s.check}>{checked&&<Check size={14} strokeWidth={3}/>}</span>{checked&&<span className={s.selectedBadge}>Seleccionado</span>}</div><div className={s.cardCopy}><strong>{course.name}</strong><span>{course.category}</span></div></label>})}</div>{!matches.length&&<div className={s.empty}><Search size={26}/><strong>No encontramos ese curso</strong><p>Prueba con otra palabra o revisa el nombre.</p><button type="button" onClick={()=>{setQuery('');search.current?.focus();}}>Ver todos los cursos</button></div>}</div>
              <footer className={s.panelFooter}><span><Check size={14}/>{chosen.length} seleccionado{chosen.length===1?'':'s'}</span><button type="button" onClick={close}>Listo <Check size={14}/></button></footer>
            </section>}
            <p className={s.helper}><ImageIcon size={14}/>Imágenes de ejemplo para revisar esta propuesta.</p>
          </div>
          <aside className={s.summary} aria-label="Resumen del registro"><p className={s.summaryTitle}>RESUMEN DEL REGISTRO</p><Building2 size={21} className={s.summaryIcon}/><h3>Constructora Andina S.A.C.</h3><span className={s.customerType}>Empresa</span><div className={s.rule}/><div className={s.summaryRow}><span>Tipo</span><strong>{kind==='service'?'Servicio':'Certificado'}</strong></div><div className={s.summaryRow}><span>Estado</span><strong><i/>{kind==='service'?'Programado':'Pendiente'}</strong></div><div className={s.rule}/><p className={s.summaryTitle}>CURSOS SELECCIONADOS <b>{chosen.length}</b></p><div className={s.summaryCourses}>{chosen.length?chosen.map(course=><div key={course.id}><div className={s.summaryThumb} aria-hidden="true"><div className={s.photo} style={picture(course.image)}/></div><span>{course.name}</span></div>):<p>Elige un curso para comenzar.</p>}</div><div className={s.rule}/><div className={s.summaryDate}><CalendarDays size={16}/><span>19 oct. 2026<small>Fecha de ejemplo</small></span></div><div className={s.total}><span>Importe total</span><strong>S/ 1,200.00</strong><small>Un importe para todos los cursos.</small></div></aside>
        </div>
        <footer className={s.windowFooter}><span>Demo · No guarda registros reales</span><div><button type="button" className={s.secondary} onClick={()=>{setSelected([]);setQuery('');setOpen(true);setNotice(false);}}>Restablecer</button><button type="button" className={s.primary} disabled={!chosen.length} onClick={()=>{close();setNotice(true);}}>Confirmar selección<Check size={16}/></button></div></footer>
      </section>
      {notice&&<div className={s.notice} role="status"><Check size={17}/><span>Selección confirmada en la demo. Puedes volver a abrir el catálogo y seguir probando.</span><button type="button" aria-label="Cerrar aviso" onClick={()=>setNotice(false)}><X size={16}/></button></div>}
      <p className={s.bottomNote}>Propuesta de catálogo visual · Puedes buscar, seleccionar varios cursos y quitarlos desde las etiquetas.</p>
    </div>
  </main>;
}
