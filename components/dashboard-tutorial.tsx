"use client";
import { useEffect, useRef, useState } from "react";

const steps = [
  { tab: "summary", title: "Vista general", text: "Aquí encuentras los servicios, clientes únicos, facturación y metas del mes. Usa el selector de mes y año para consultar otro período." },
  { tab: "services", title: "Agenda de servicios", text: "Registra y edita servicios con Nuevo servicio. Selecciona cursos, instructor, fechas y horarios. Cada fecha cuenta como una jornada; el importe se suma una sola vez. Al cambiar a Facturado, el importe cuenta en el mes de facturación." },
  { tab: "certificates", title: "Venta de certificados", text: "Usa Nueva venta para registrar certificados de empresas o personas naturales. Puedes filtrar por estado, buscar clientes y editar los registros. Solo los certificados de empresas facturados cuentan para la meta de facturación." },
  { tab: "performance", title: "Rendimiento comercial", text: "Consulta el avance semanal, ranking y resumen mensual por comercial. Los administradores pueden guardar el color de cada comercial. Las ventas se vinculan automáticamente al comercial asignado a tu cuenta." },
  { tab: "instructors", title: "Registro de instructores", text: "Esta tabla se forma automáticamente con las fechas de la agenda. Filtra por instructor, curso o fecha y exporta a Excel. Confirmación es temporal: se borra al salir del apartado o recargar." },
  { tab: "support", title: "Base de soporte", text: "Consulta y gestiona instructores, cursos, ubicaciones y vigencias SCTR. Los cursos de cada instructor se eligen del catálogo. La gestión de comerciales está disponible únicamente para administradores." },
  { tab: "summary", title: "Personaliza tu espacio", text: "Puedes alternar entre tema claro y oscuro, contraer la barra lateral y desplazarte por el menú. Cerrar sesión está abajo. Para repetir este recorrido, pulsa Ver tutorial en la barra superior." }
];
export default function DashboardTutorial({ initialStep, isAdmin, onTab, onClose }: { initialStep: number; isAdmin: boolean; onTab: (tab: string) => void; onClose: () => void }) {
  const items = isAdmin ? [...steps.slice(0, 6), { tab: "support", title: "Usuarios", text: "En Usuarios puedes crear cuentas, asignar un comercial y elegir el rol. Al eliminar una cuenta, se conservan su comercial y los registros vendidos. El vendedor necesita un comercial asignado para registrar ventas y servicios." }, steps[6]] : steps;
  const [step, setStep] = useState(Math.min(initialStep, items.length - 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  const currentTab = items[step].tab;
  useEffect(() => { onTab(currentTab); }, [currentTab, onTab]);
  async function save(next: number, completed = false) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/tutorial", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: next, completed }) });
      if (!res.ok) throw new Error("No se pudo guardar el progreso. Inténtalo nuevamente.");
      if (completed) onClose(); else setStep(next);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="tutorial-dialog" aria-labelledby="tutorial-title" aria-describedby="tutorial-description" onCancel={e => { e.preventDefault(); if (!busy) void save(step, true); }}>
    <div className="tutorial-progress">GUÍA CONSITEC · {step + 1} DE {items.length}</div>
    <h2 id="tutorial-title">{items[step].title}</h2><p id="tutorial-description">{items[step].text}</p>
    {error && <p role="alert">{error}</p>}
    <div className="tutorial-actions"><button className="btn secondary" disabled={busy} onClick={() => void save(step, true)}>Omitir</button><div><button className="btn secondary" disabled={busy || step === 0} onClick={() => void save(step - 1)}>Atrás</button><button className="btn" disabled={busy} onClick={() => void save(step === items.length - 1 ? step : step + 1, step === items.length - 1)}>{busy ? "Guardando…" : step === items.length - 1 ? "Finalizar" : "Siguiente"}</button></div></div>
  </dialog>;
}
