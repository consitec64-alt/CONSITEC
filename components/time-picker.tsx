"use client";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Clock3, ChevronDown } from 'lucide-react';
import { useTutorial } from '@/components/dashboard-tutorial';

const pad = (n:number) => String(n).padStart(2,'0');
const times = Array.from({length:24},(_,h)=>Array.from({length:12},(_,m)=>`${pad(h)}:${pad(m*5)}`)).flat();
export default function TimePicker({name,value,onChange,label}:{name:string;value:string;onChange:(v:string)=>void;label:string}){
  const [open,setOpen]=useState(false),[invalid,setInvalid]=useState(false),[stage,setStage]=useState<'hours'|'minutes'>('hours');
  const [hour,setHour]=useState(0),[minute,setMinute]=useState(0),[minuteChosen,setMinuteChosen]=useState(false);
  const popupId=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),popup=useRef<HTMLDivElement>(null);
  const {active:tutorial}=useTutorial();
  const legacy=/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)&&Number(value.slice(3))%5!==0;
  const begin=useCallback(()=>{setHour(Number(value.slice(0,2))||0);setMinute(Number(value.slice(3))||0);setMinuteChosen(false);setStage('hours');setOpen(true);},[value]);
  function close(){setOpen(false);trigger.current?.focus();}
  useEffect(()=>{if(tutorial){if(name==='startTime'&&tutorial.target.includes('.clock-popup'))begin();else setOpen(false);}},[tutorial,name,begin]);
  useEffect(()=>{
    if(!open)return;const node=root.current;
    const outside=(e:PointerEvent)=>{if(!node?.contains(e.target as Node))setOpen(false);};
    const keyboard=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();setOpen(false);trigger.current?.focus();}};
    node?.addEventListener('keydown',keyboard);document.addEventListener('pointerdown',outside);popup.current?.scrollIntoView({block:'nearest',behavior:'instant'});
    return()=>{node?.removeEventListener('keydown',keyboard);document.removeEventListener('pointerdown',outside);};
  },[open]);
  const display=`${pad(hour)}:${pad(minute)}`;
  const numbers=stage==='hours'?[...Array.from({length:23},(_,i)=>i+1),0]:Array.from({length:12},(_,i)=>i*5);
  return <div className="time-picker-control" data-time-kind={name} ref={root} onBlurCapture={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}>
    <button ref={trigger} type="button" className="clock-trigger" aria-label={`Elegir hora de ${label}${value?`, ${value}`:''}`} aria-expanded={open} aria-controls={open?popupId:undefined} onClick={()=>open?close():begin()}><Clock3 size={18} aria-hidden="true"/><span>{value||'Elige hora'}</span><ChevronDown size={15} aria-hidden="true"/></button>
    <select className="time-picker-native" name={name} aria-label={label} aria-hidden="true" tabIndex={-1} value={value} required onChange={e=>onChange(e.target.value)} onInvalid={e=>{e.preventDefault();setInvalid(true);begin();trigger.current?.focus();}}><option value="" disabled>Elige hora</option>{legacy&&<option value={value} disabled>{value} (guardada)</option>}{times.map(t=><option key={t} value={t}>{t}</option>)}</select>
    {open&&<div id={popupId} ref={popup} className="clock-popup" role="group" aria-label={`Reloj de ${label}`}><div className="clock-digital dial-digital"><strong aria-live="polite">{display}</strong><small>24 horas · minutos cada 5</small></div><p>{stage==='hours'?'1. Pulsa la hora en el reloj':'2. Pulsa los minutos en el reloj'}</p>
      <div className="clock-sphere" role="group" aria-label={stage==='hours'?'Seleccionar horas':'Seleccionar minutos'}>
        <svg className="interactive-clock-face" viewBox="0 0 240 240" aria-hidden="true"><circle className="clock-rim" cx="120" cy="120" r="119"/><circle className="clock-dial" cx="120" cy="120" r="113"/><line className="clock-minute-hand" x1="120" y1="120" x2="120" y2="53" transform={`rotate(${minute*6} 120 120)`}/><line className="clock-hour-hand" x1="120" y1="120" x2="120" y2="77" transform={`rotate(${(hour%12)*30+minute/2} 120 120)`}/><circle className="clock-pin" cx="120" cy="120" r="5"/></svg>
        {numbers.map(n=>{const angle=(stage==='hours'?n%12:n/5)*Math.PI/6,radius=stage==='hours'&&(n>12||n===0)?61:93;const selected=stage==='hours'?n===hour:n===minute;return <button key={`${stage}-${n}`} type="button" disabled={!!tutorial} className={`clock-number-button ${selected?'selected':''}`} style={{left:`${50+radius/240*100*Math.sin(angle)}%`,top:`${50-radius/240*100*Math.cos(angle)}%`}} aria-label={`Elegir ${stage==='hours'?'hora':'minutos'} ${pad(n)}, ${label}`} aria-pressed={selected} onClick={()=>{if(stage==='hours'){setHour(n);setMinuteChosen(false);setStage('minutes');}else{setMinute(n);setMinuteChosen(true);setInvalid(false);onChange(`${pad(hour)}:${pad(n)}`);}}}>{pad(n)}</button>;})}
      </div>
      {stage==='minutes'&&<button type="button" className="text-button" onClick={()=>setStage('hours')}>Volver a elegir hora</button>}
      {legacy&&<small>Horario anterior conservado hasta completar una nueva selección.</small>}{invalid&&<small role="alert">Elige hora y minutos para continuar.</small>}
      <button type="button" className="btn secondary clock-done" disabled={!minuteChosen} onClick={close}>Listo</button>
    </div>}
  </div>;
}
