"use client";

import { useTutorial } from "@/components/dashboard-tutorial";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import WorkspaceBanner from "@/components/workspace-banner";
import { Trash2, UserPlus, Users } from "lucide-react";
import CompanyFooter from "@/components/company-footer";
import ThemeToggle from "@/components/theme-toggle";
import Brand from "@/components/brand";

type User = { id: string; username: string; role: "ADMIN" | "SALES"; salespersonId: string | null; salesperson: { id: string; name: string } | null };
async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (res.status === 401) { window.location.assign("/login"); throw new Error("Inicia sesión nuevamente."); }
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "No se pudo completar la operación.");
  return body;
}

export default function UsersPanel() {
  const { start: startTutorial } = useTutorial();
  const [users, setUsers] = useState<User[]>([]);
  const [salespeople, setSalespeople] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (deleteTarget) deleteDialog.current?.showModal(); }, [deleteTarget]);
  async function load() {
    setLoading(true);
    try {
      const [accounts, current, commercials] = await Promise.all([request("/api/users"), request("/api/auth/me"), request("/api/metadata/salespeople")]);
      setUsers(accounts); setCurrentId(current.id); setSalespeople(commercials);
    }
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
      setNotice(values.salespersonId ? `Comercial asignado a ${user.username}. Las nuevas ventas usarán esta asignación; los registros anteriores se conservan.` : `Correo guardado. Esta cuenta ahora inicia sesión con ${user.username} y su contraseña actual.`);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo actualizar el correo."); }
    finally { setBusy(false); }
  }
  async function deleteUser() {
    if (!deleteTarget || busy) return;
    setBusy(true); setDeleteError(""); setNotice("");
    try {
      await request(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      setUsers(previous => previous.filter(user => user.id !== deleteTarget.id));
      setNotice(`Cuenta ${deleteTarget.username} eliminada. Su acceso quedó revocado.`);
      deleteDialog.current?.close(); setDeleteTarget(null);
    } catch (err) { setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta."); }
    finally { setBusy(false); }
  }
  return <main className="page-content users-page">
    <Link href="/dashboard" className="text-button">← Volver al panel</Link>
    <div className="page-heading"><div><div className="users-title"><h1>Usuarios</h1><button className="btn secondary" onClick={startTutorial}>Ver tutorial</button><ThemeToggle /></div><p>Crea cuentas y asigna el comercial de cada usuario.</p></div><Brand href="/dashboard" className="brand-compact" /></div>
    <WorkspaceBanner variant="users" kicker="CADA PERSONA, SU ACCESO Y SU COMERCIAL." title="Un equipo conectado empieza aquí" description="Crea accesos, asigna comerciales y mantén las cuentas organizadas. Solo los administradores pueden gestionar usuarios." icon={Users} actions={<><button type="button" className="btn" onClick={()=>{const input=document.querySelector<HTMLInputElement>('.users-form [name=email]');input?.scrollIntoView({behavior:'smooth',block:'center'});input?.focus({preventScroll:true});}}><UserPlus size={16}/>Crear un acceso</button><button type="button" className="btn secondary" onClick={()=>document.getElementById('existing-accounts')?.scrollIntoView({behavior:'smooth',block:'start'})}><Users size={16}/>Cuentas existentes</button></>}/>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {notice && <p className="users-notice" role="status">{notice}</p>}
    <section className="panel"><div className="section-heading"><h2>Crear usuario</h2></div>
      <form onSubmit={create} className="users-form">
        <label className="users-field">Correo electrónico<input name="email" type="email" autoComplete="off" autoCapitalize="none" required maxLength={254} placeholder="nombre@empresa.com" /><small>Será el correo para iniciar sesión.</small></label>
        <label className="users-field">Contraseña<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /><small>Al menos 12 caracteres; máximo 72 bytes.</small></label>
        <label className="users-field">Rol<select name="role" defaultValue="SALES"><option value="SALES">Vendedor</option><option value="ADMIN">Administrador</option></select></label>
        <label className="users-field">Comercial asignado<select name="salespersonId" defaultValue="" required><option value="">Selecciona un comercial</option>{salespeople.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
        <div className="users-form-footer"><p className="form-note">Los administradores pueden crear usuarios. Ambos roles tienen acceso a la operación comercial. Cada cuenta registra automáticamente las nuevas ventas a nombre de su comercial asignado.</p>
        <button className="btn" disabled={busy}>{busy ? "Creando…" : "Crear usuario"}</button></div>
      </form>
    </section>
    <section className="panel" id="existing-accounts"><div className="section-heading"><h2>Cuentas existentes</h2><button className="text-button" disabled={loading} onClick={() => { setError(""); void load().catch(err => setError(err.message)); }}>Actualizar</button></div>
      <p className="form-note">Asigna un correo a las cuentas existentes. Su contraseña se conserva; después del cambio deben ingresar con el correo nuevo. Verifica la dirección antes de guardar.</p>
      {loading ? <p role="status">Cargando usuarios…</p> : <ul className="user-account-list">{users.map(user => <li key={user.id} className="user-account">
        <div className="user-identity"><strong>{user.username}</strong><span className="user-role">{user.role === "ADMIN" ? "Administrador" : "Vendedor"}</span>
        <button type="button" className="user-delete-button" disabled={busy || user.id === currentId} title={user.id === currentId ? "No puedes eliminar tu propia cuenta" : undefined} onClick={() => { setDeleteError(""); setDeleteTarget(user); }} aria-label={`Eliminar cuenta de ${user.username}`}><Trash2 size={14} />Eliminar cuenta</button></div>
        <form className="user-email-form" onSubmit={updateEmail}>
        <input type="hidden" name="id" value={user.id} />
        <label className="users-field">Correo de {user.username}<input name="email" type="email" autoComplete="off" autoCapitalize="none" required maxLength={254} defaultValue={user.username.includes("@") ? user.username : ""} placeholder="nombre@empresa.com" /></label>
        <button className="btn secondary" disabled={busy}>{busy ? "Guardando…" : "Guardar correo"}</button>
      </form><form className="user-email-form" onSubmit={updateEmail}><input type="hidden" name="id" value={user.id} /><label className="users-field">Comercial de {user.username}<select name="salespersonId" defaultValue={user.salespersonId || ''} required><option value="">Sin asignar</option>{salespeople.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label><button className="btn secondary" disabled={busy}>Guardar comercial</button></form></li>)}</ul>}
    </section>
    {deleteTarget && <dialog ref={deleteDialog} className="dialog users-delete-dialog" aria-labelledby="delete-user-title" onCancel={e => { if (busy) e.preventDefault(); else setDeleteTarget(null); }}>
      <div className="section-heading"><h2 id="delete-user-title">Eliminar usuario</h2></div>
      <p>Se eliminará la cuenta <strong>{deleteTarget.username}</strong> y perderá el acceso a CONSITEC. Sus registros comerciales se conservan. Esta acción no se puede deshacer.</p>
      {deleteError && <p className="error-banner" role="alert">{deleteError}</p>}
      <div className="dialog-actions"><button type="button" className="btn secondary" disabled={busy} onClick={() => { deleteDialog.current?.close(); setDeleteTarget(null); }}>Cancelar</button><button type="button" className="btn destructive" disabled={busy} onClick={() => void deleteUser()}>{busy ? "Eliminando…" : "Eliminar usuario"}</button></div>
    </dialog>}
    <CompanyFooter />
  </main>;
}
