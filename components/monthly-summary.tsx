import { Meta, Service } from '@/lib/ui-types';
const money = (value: number | string) => new Intl.NumberFormat('es-PE', {style:'currency',currency:'PEN'}).format(Number(value));
const statuses: Record<string,string> = {SCHEDULED:'Programado',EXECUTED:'Ejecutado',INVOICED:'Facturado'};
export default function MonthlySummary({ services, salespeople, month, year }: { services: Service[]; salespeople: Meta[]; month: number; year: number }) {
  const sameMonth = (s: Service) => s.status === "INVOICED" && !s.certificatesOnly && Number(s.invoicedAt?.slice(0, 4)) === year && Number(s.invoicedAt?.slice(5, 7)) === month;
  return <section className="panel monthly-summary"><div className="section-heading"><div><h2>Resumen mensual por comercial</h2><p>Servicios del mes, una fila por servicio. La facturación suma en el mes de la fecha de facturación.</p></div></div>{salespeople.map(rep => {
    const records = services.filter(s => s.salesperson.id === rep.id);
    const cents = records.filter(sameMonth).reduce((sum,s) => sum + Math.round(Number(s.amount)*100),0);
    return <details className="commercial-summary" key={rep.id} open><summary><strong>{rep.name}</strong><span>{records.length} servicios · {money(cents/100)} facturados en servicios</span></summary><div className="table-scroll"><table><thead><tr><th>Código de correlativo</th><th>Empresa</th><th>Monto</th><th>Estado</th></tr></thead><tbody>{records.map(s => <tr key={s.id}><td>{s.correlativeCode || 'Sin código'}</td><td><strong>{s.company}</strong></td><td><b>{money(s.amount)}</b>{s.invoicedAt && <small>Facturación: {s.invoicedAt.slice(0,10)}</small>}</td><td><span className={`status status-${s.status.toLowerCase()}`}>{statuses[s.status]}</span></td></tr>)}</tbody></table>{!records.length && <p className="muted summary-empty">Sin servicios este mes.</p>}</div></details>;
  })}{!salespeople.length && <p className="muted">Agrega comerciales en la base de soporte.</p>}</section>;
}
