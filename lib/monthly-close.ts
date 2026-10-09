import { Prisma } from '@prisma/client';
export class MonthClosed extends Error {}
export type Period = { year: number; month: number };
export const monthKey = ({year,month}: Period) => `${year}-${String(month).padStart(2,'0')}`;
export function limaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get = (type: string) => parts.find(p=>p.type===type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function canClose(period: Period, now = new Date()) {
  const last = new Date(Date.UTC(period.year,period.month,0)).toISOString().slice(0,10);
  return limaToday(now) >= last;
}
export function parsePeriod(year: unknown, month: unknown): Period | null {
  const y=Number(year),m=Number(month);
  return Number.isInteger(y)&&y>=2000&&y<=2100&&Number.isInteger(m)&&m>=1&&m<=12 ? {year:y,month:m}:null;
}
type FinancialRecord = { serviceDate?: Date; saleDate?: Date; invoicedAt?: Date | null; status?: string; dates?: {date:Date}[] };
export function recordMonths(...records: (FinancialRecord | undefined)[]) {
  return [...new Set(records.flatMap(row=>row ? [row.serviceDate,row.saleDate,...(row.dates??[]).map(d=>d.date),row.status==='INVOICED'?(row.invoicedAt??row.serviceDate??row.saleDate):null].filter((d):d is Date=>!!d).map(d=>d.toISOString().slice(0,7)):[]))].sort();
}
// Shared with every business write: a close cannot race a write into the month.
export async function lockMonths(tx: Prisma.TransactionClient, keys: string[]) {
  for (const key of [...new Set(keys)].sort()) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`month:${key}`}))::text`;
}
export async function assertMonthsOpen(tx: Prisma.TransactionClient, ...records: (FinancialRecord | undefined)[]) {
  const keys=recordMonths(...records);await lockMonths(tx,keys);
  const closed=await tx.monthlyClose.findFirst({where:{id:{in:keys},closedAt:{not:null}}});
  if(closed) throw new MonthClosed(`El mes ${closed.id} está cerrado. Un administrador debe reabrirlo antes de modificar registros que lo afecten.`);
}
