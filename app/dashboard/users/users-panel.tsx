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
  async function updateEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true); setError(""); setNotice("");
    try {
      const user: User = await request("/api/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values)
      });
      setUsers(previous => previous.map(item => item.id === user.id ? user : item).sort((a, b) => a.username.localeCompare(b.username)));
      setNotice(`Correo guardado. Esta cuenta ahora inicia sesión con ${user.username} y su contraseña actual.`);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo actualizar el correo."); }
    finally { setBusy(false); }
  }
  return <main className="page-content">
    <Link href="/dashboard" className="text-button">← Volver al panel</Link>
    <div className="page-heading"><div><h1>Usuarios</h1><p>Crea cuentas para acceder a CONSITEC.</p></div></div>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <section className="panel support-card"><h2>Crear usuario</h2>
      <form onSubmit={create} className="support-form">
        <label>Correo electrónico<input name="email" type="email" autoComplete="off" autoCapitalize="none" required maxLength={254} placeholder="nombre@empresa.com" /><small>Será el correo para iniciar sesión.</small></label>
        <label>Contraseña<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /><small>Al menos 12 caracteres; máximo 72 bytes.</small></label>
        <label>Rol<select name="role" defaultValue="SALES"><option value="SALES">Vendedor</option><option value="ADMIN">Administrador</option></select></label>
        <p className="form-note">Los administradores pueden crear usuarios. Ambos roles tienen acceso a la operación comercial. Las cuentas de acceso son independientes del catálogo de comerciales.</p>
        <button className="btn" disabled={busy}>{busy ? "Creando…" : "Crear usuario"}</button>
      </form>
    </section>
    <section className="panel support-card"><div className="section-heading"><h2>Cuentas existentes</h2><button className="text-button" disabled={loading} onClick={() => { setError(""); void load().catch(err => setError(err.message)); }}>Actualizar</button></div>
      <p className="form-note">Asigna un correo a las cuentas existentes. Su contraseña se conserva; después del cambio deben ingresar con el correo nuevo. Verifica la dirección antes de guardar.</p>
      {loading ? <p role="status">Cargando usuarios…</p> : <div>{users.map(user => <form key={user.id} className="support-form" onSubmit={updateEmail}>
        <strong>{user.username} · {user.role === "ADMIN" ? "Administrador" : "Vendedor"}</strong>
        <input type="hidden" name="id" value={user.id} />
        <label>Correo de {user.username}<input name="email" type="email" autoComplete="off" autoCapitalize="none" required maxLength={254} defaultValue={user.username.includes("@") ? user.username : ""} placeholder="nombre@empresa.com" /></label>
        <button className="btn secondary" disabled={busy}>{busy ? "Guardando…" : "Guardar correo"}</button>
      </form>)}</div>}
    </section>
  </main>;
}
