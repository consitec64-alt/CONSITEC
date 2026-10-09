"use client";
import {useState,useEffect} from 'react';
import {useTutorial} from '@/components/dashboard-tutorial';
import {Clock3} from 'lucide-react';
export default function TimePicker({name,value,onChange,label}:{name:string;value:string;onChange:(v:string)=>void;label:string}){
 const {active:tutorial}=useTutorial();
 const [open,setOpen]=useState(false);
 useEffect(()=>{if(tutorial)setOpen(tutorial.title==='Selector de horas'&&name==='startTime');},[tutorial,name]);const [hour,minute]=(value||'09:00').split(':');
 return <div className="time-picker"><div className="time-picker-control"><input name={name} aria-label={label} type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" maxLength={5} placeholder="09:00" value={value} required onChange={e=>onChange(e.target.value)}/><button type="button" className="icon-button" aria-label={`Elegir ${label}`} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Clock3 size={19}/></button></div>{open&&<div className="clock-options" role="group" aria-label={`Reloj de ${label}`}><Clock3 size={24}/><label>Hora<select aria-label={`Hora de ${label}`} value={hour} onChange={e=>onChange(`${e.target.value}:${/^\d{2}$/.test(minute)?minute:'00'}`)}>{Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><option key={h}>{h}</option>)}</select></label><span>:</span><label>Minutos<select aria-label={`Minutos de ${label}`} value={minute} onChange={e=>onChange(`${/^\d{2}$/.test(hour)?hour:'09'}:${e.target.value}`)}>{Array.from({length:60},(_,i)=>String(i).padStart(2,'0')).map(m=><option key={m}>{m}</option>)}</select></label><button type="button" className="btn secondary" onClick={()=>{onChange(`${/^\d{2}$/.test(hour)?hour:'09'}:${/^\d{2}$/.test(minute)?minute:'00'}`);setOpen(false);}}>Listo</button></div>}</div>;
}
