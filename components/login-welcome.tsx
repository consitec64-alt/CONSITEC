"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
export default function LoginWelcome({name,onComplete}:{name:string|null;onComplete:()=>void}) {
  const screen=useRef<HTMLDivElement>(null),complete=useRef(onComplete);
  complete.current=onComplete;
  useEffect(()=>{
    screen.current?.focus();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer=setTimeout(()=>complete.current(),reduced?1200:2800);
    return()=>clearTimeout(timer);
  },[]);
  return <div ref={screen} tabIndex={-1} className="login-welcome" aria-label="Bienvenida a CONSITEC">
    <div className="welcome-curtain welcome-left" aria-hidden="true"/><div className="welcome-curtain welcome-right" aria-hidden="true"/>
    <div className="welcome-content"><div className="welcome-logo"><Image src="/consitec-logo.png" alt="CONSITEC" width={649} height={409} sizes="240px" priority /></div><h1 role="status">Bienvenido otra vez{name&&<span>{name}</span>}</h1><p>Tu espacio de trabajo está listo.</p><button className="welcome-enter" onClick={()=>complete.current()}>Entrar al panel</button></div>
  </div>;
}
