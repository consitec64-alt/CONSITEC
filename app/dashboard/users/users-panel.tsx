"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type User = { id: string; username: string; role: "ADMIN" | "SALES" };
async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (res.status === 401) { window.location.assign("/login"); throw new Error("Inicia sesión nuevamente."); }
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "No se pudo completar la operación.");
  return body;
}

export default function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    setLoading(true);
    try { setUsers(await request("/api/users")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load().catch(err => setError(err.message)); }, []);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true); setError(""); setNotice("");
    try {
      const user: User = await request("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values)
      });
      setUsers(previous => [...previous, user].sort((a, b) => a.username.localeCompare(b.username)));
      form.reset(); setNotice(`Usuario ${user.username} creado. Ya puede iniciar sesión.`);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo crear el usuario."); }
    finally { setBusy(false); }
  }
  return <main className="page-content">
    <Link href="/dashboard" className="text-button">← Volver al panel</Link>
    <div className="page-heading"><div><h1>Usuarios</h1><p>Crea cuentas para acceder a CONSITEC.</p></div></div>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <section className="panel support-card"><h2>Crear usuario</h2>
      <form onSubmit={create} className="support-form">
        <label>Nombre de usuario<input name="username" autoComplete="off" required minLength={3} maxLength={100} pattern="[a-zA-Z0-9._\-]+" /><small>Letras, números, punto, guion o guion bajo.</small></label>
        <label>Contraseña<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /><small>Al menos 12 caracteres; máximo 72 bytes.</small></label>
        <label>Rol<select name="role" defaultValue="SALES"><option value="SALES">Vendedor</option><option value="ADMIN">Administrador</option></select></label>
        <p className="form-note">Los administradores pueden crear usuarios. Ambos roles tienen acceso a la operación comercial. Las cuentas de acceso son independientes del catálogo de comerciales.</p>
        <button className="btn" disabled={busy}>{busy ? "Creando…" : "Crear usuario"}</button>
      </form>
    </section>
    <section className="panel support-card"><div className="section-heading"><h2>Cuentas existentes</h2><button className="text-button" disabled={loading} onClick={() => { setError(""); void load().catch(err => setError(err.message)); }}>Actualizar</button></div>
      {loading ? <p role="status">Cargando usuarios…</p> : <ul className="support-list">{users.map(user => <li key={user.id}><strong>{user.username}</strong><span>{user.role === "ADMIN" ? "Administrador" : "Vendedor"}</span></li>)}</ul>}
    </section>
  </main>;
}
