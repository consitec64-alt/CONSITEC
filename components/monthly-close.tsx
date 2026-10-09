"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTutorial } from '@/components/dashboard-tutorial';
type Period={year:number;month:number};
type State={id:string;closedAt:string|null;closedByName:string|null;canClose:boolean;today:string;pending:string[]};
const label=(key:string)=>new Intl.DateTimeFormat('es-PE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z'));
export default function MonthlyClose({period,isAdmin,onDone,onPeriod,refreshKey}:{period:Period;isAdmin:boolean;onDone:()=>Promise<void>;onPeriod:(period:Period)=>void;refreshKey:unknown}) {
  const {active:tutorial}=useTutorial();
  const [state,setState]=useState<State|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [popup,setPopup]=useState<{id:string;mode:'notice'|'confirm';action:'CLOSE'|'REOPEN'}|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const reload=useCallback(async(signal?:AbortSignal)=>{
    const res=await fetch(`/api/monthly-close?month=${period.month}&year=${period.year}`,{signal});
    if(!res.ok)throw Error('No se pudo consultar el cierre mensual. Pulsa Actualizar para reintentar.');
    const data:State=await res.json();if(!signal?.aborted){setState(data);setError('');}return data;
  },[period.month,period.year]);
  useEffect(()=>{const controller=new AbortController();setState(null);const run=()=>void reload(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e.message);});run();const timer=setInterval(run,60000);return()=>{controller.abort();clearInterval(timer);};},[reload,refreshKey]);
  useEffect(()=>{
    if(!isAdmin||tutorial||popup||!state)return;
    try{if(sessionStorage.getItem('monthly-close-reminder-day')===state.today)return;}catch{}
    const next=state.pending.find(id=>{try{return sessionStorage.getItem(`close-notice:${id}`)!==state.today;}catch{return true;}});
    if(next)setPopup({id:next,mode:'notice',action:'CLOSE'});
  },[state,isAdmin,tutorial,popup]);
  useEffect(()=>{if(popup&&!tutorial){const node=dialog.current;node?.showModal();return()=>node?.close();}},[popup,tutorial]);
  const dismiss=()=>{if(popup&&state)try{sessionStorage.setItem(`close-notice:${popup.id}`,state.today);sessionStorage.setItem('monthly-close-reminder-day',state.today);}catch{}setPopup(null);};
  async function save(){
    if(!popup||busy)return;setBusy(true);setError('');
    try{const [year,month]=popup.id.split('-').map(Number);const res=await fetch('/api/monthly-close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({year,month,action:popup.action})});const data=await res.json();if(!res.ok)throw Error(data.error||'No se pudo guardar el cierre');dismiss();await onDone();await reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const review=()=>{if(!popup)return;const [year,month]=popup.id.split('-').map(Number);onPeriod({year,month});setPopup({...popup,mode:'confirm'});};
  return <section className="monthly-close-panel" data-tour="monthly-close" aria-label="Cierre mensual">
    <div><strong>{!state?'Consultando cierre':state.closedAt?'Mes cerrado':'Mes abierto'} · {label(`${period.year}-${String(period.month).padStart(2,'0')}`)}</strong><p>{state?.closedAt?`Cerrado por ${state.closedByName}. Para corregir registros, un administrador debe reabrir el mes.`:isAdmin?'Revisa los reportes antes de cerrar. Disponible desde el último día del mes.':'Un administrador puede cerrar el mes. Los registros de un mes cerrado se consultan, pero no se modifican.'}</p></div>
    {isAdmin&&state&&<button className="btn secondary" disabled={busy||(!state.closedAt&&!state.canClose)} onClick={()=>{setError('');setPopup({id:state.id,mode:'confirm',action:state.closedAt?'REOPEN':'CLOSE'});}}>{state.closedAt?'Reabrir mes':'Cerrar mes'}</button>}
    {error&&<p role="alert" className="error-banner">{error}</p>}
    {popup&&!tutorial&&<dialog ref={dialog} className="monthly-close-dialog" aria-labelledby="close-title" onCancel={e=>{e.preventDefault();if(!busy)dismiss();}}>
      <h2 id="close-title">{popup.mode==='notice'?'Cierre mensual pendiente':popup.action==='CLOSE'?'Confirmar cierre mensual':'Reabrir mes'} · {label(popup.id)}</h2>
      <p>{popup.mode==='notice'?'Ya puedes revisar y cerrar este mes. El cierre requiere tu confirmación; no se realiza automáticamente.':popup.action==='CLOSE'?'Al confirmar, no se podrán agregar, editar, eliminar ni restaurar servicios o ventas que afecten este mes. Revisa primero la agenda, facturación y reportes.':'Se habilitarán nuevamente los cambios en los registros de este mes. La reapertura quedará registrada en el historial.'}</p>
      {popup.mode==='confirm'&&<p>Un servicio que tiene fechas en varios meses queda bloqueado si cualquiera de esos meses está cerrado. Solo un administrador puede reabrirlos.</p>}
      {error&&<p role="alert">{error}</p>}
      <div className="dialog-actions"><button className="btn secondary" disabled={busy} onClick={dismiss}>{popup.mode==='notice'?'Recordar después':'Cancelar'}</button><button className="btn" disabled={busy} onClick={()=>popup.mode==='notice'?review():void save()}>{busy?'Guardando…':popup.mode==='notice'?'Revisar cierre':popup.action==='CLOSE'?'Confirmar cierre':'Confirmar reapertura'}</button></div>
    </dialog>}
  </section>;
}
