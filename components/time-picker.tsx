"use client";
import {Clock3} from 'lucide-react';

export default function TimePicker({name,value,onChange,label}:{name:string;value:string;onChange:(v:string)=>void;label:string}){
 const hasSavedMinutes=/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)&&!value.endsWith(':00');
 return <div className="time-picker-control"><Clock3 size={18} aria-hidden="true"/><select name={name} aria-label={label} value={value} required onChange={e=>onChange(e.target.value)}><option value="" disabled>Elige hora</option>{hasSavedMinutes&&<option value={value} disabled>{value} (guardada)</option>}{Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`).map(hour=><option key={hour} value={hour}>{hour}</option>)}</select></div>;
}
