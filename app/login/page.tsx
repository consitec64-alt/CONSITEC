"use client";

import LoginWelcome from "@/components/login-welcome";
import ThemeToggle from "@/components/theme-toggle";
import Brand from "@/components/brand";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, AlertCircle, Eye, EyeOff, UserRound } from "lucide-react";
export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [welcome,setWelcome]=useState<{name:string|null}|null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (loading) return; setLoading(true); setError("");
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Revisa tu correo o usuario y contraseña.");
      let name: string|null=null;
      try {
        const me=await fetch("/api/auth/me",{cache:"no-store",signal:AbortSignal.timeout(2500)});
        if(me.ok){const user=await me.json();name=typeof user.displayName==="string"?user.displayName:typeof user.salesperson?.name==="string"?user.salesperson.name:null;}
      }catch{/* A temporary profile failure must not prevent access. */}
      setWelcome({name});
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo iniciar sesión. Inténtalo nuevamente."); setLoading(false); }
  }
  if(welcome)return <LoginWelcome name={welcome.name} onComplete={()=>router.replace("/dashboard")} />;
  return <main className="login-shell login-modern">
    <section className="login-story" aria-label="CONSITEC, gestión comercial y operativa">
      <div className="login-brand-content">
        <Brand href="/" className="brand-on-dark" sizes="(max-width: 760px) 180px, 440px" />
        <h1>Tu equipo, conectado.</h1>
        <p>Gestiona servicios, certificados y tu actividad comercial.</p>
      </div>
      <small>CONSITEC · Gestión comercial y operativa</small>
    </section>
    <section className="login-form-panel" aria-labelledby="login-title">
      <div className="login-form">
        <div className="login-theme"><ThemeToggle /></div>
        <h2 id="login-title">Bienvenido a CONSITEC</h2>
        <p>Ingresa a tu espacio de trabajo.</p>
        <form onSubmit={onSubmit} className="grid">
          <label htmlFor="login-username">Correo o usuario</label>
          <div className="login-input-wrap"><UserRound size={19} aria-hidden="true" /><input id="login-username" name="username" placeholder="Tu correo o usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required disabled={loading} /></div>
          <label htmlFor="login-password">Contraseña</label>
          <div className="login-input-wrap"><LockKeyhole size={19} aria-hidden="true" /><input id="login-password" name="password" type={showPassword ? "text" : "password"} placeholder="Ingresa tu contraseña" autoComplete="current-password" required disabled={loading} /><button type="button" className="login-password-toggle" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
          <button className="btn login-submit" disabled={loading}>{loading ? "Ingresando…" : "Iniciar sesión"}<ArrowRight size={19} aria-hidden="true" /></button>
          {error && <div className="error-banner" role="alert"><AlertCircle size={17} aria-hidden="true" />{error}</div>}
        </form>
        <p className="login-help">¿No recuerdas tu contraseña? Contacta a tu administrador.</p>
        <small>Panel comercial y operativo</small>
      </div>
    </section>
  </main>;
}
