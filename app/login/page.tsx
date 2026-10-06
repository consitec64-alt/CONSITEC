"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, AlertCircle } from "lucide-react";
export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError("");
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Revisa tu usuario y contraseña.");
      router.push("/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo iniciar sesión. Inténtalo nuevamente."); setLoading(false); }
  }
  return <main className="login-shell"><section className="login-story"><Link className="brand" href="/"><span className="brand-mark">C<span>.</span></span><span>CONSITEC<small>Gestión comercial</small></span></Link><div><span className="eyebrow">TU EQUIPO. TU OPERACIÓN.</span><h1>Todo conectado.<br />Todo bajo control.</h1><p>Organiza tus servicios, consulta las ventas de certificados y sigue el avance de tu equipo en un mismo espacio.</p><div className="login-pills"><span>Servicios</span><span>Certificados</span><span>Equipo comercial</span></div></div><small>CONSITEC · Gestión comercial y operativa</small></section><section className="login-form-panel"><div className="login-form"><span className="login-lock"><LockKeyhole size={24} /></span><h2>Bienvenido a Consitec</h2><p>Ingresa para acceder a tu espacio de trabajo.</p><form onSubmit={onSubmit} className="grid"><label>Usuario<input name="username" placeholder="Ingresa tu usuario" autoComplete="username" required /></label><label>Contraseña<input name="password" type="password" placeholder="Ingresa tu contraseña" autoComplete="current-password" required /></label><button className="btn" disabled={loading}>{loading ? "Ingresando…" : "Ingresar al panel"}<ArrowRight size={17} /></button>{error && <div className="error-banner" role="alert"><AlertCircle size={17} />{error}</div>}</form><small>Panel interno de operaciones</small></div></section></main>;
}
