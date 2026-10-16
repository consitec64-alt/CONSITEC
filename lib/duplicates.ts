import { assignedItems } from './date-assignments';
import { Prisma } from '@prisma/client';
export const customerKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-PE');
export class PossibleDuplicate extends Error {
  constructor(public matches: { id: string; name: string; date: string; amount: string }[]) { super('Hay registros con el mismo cliente, curso y fecha. Revisa si son ventas diferentes antes de continuar.'); }
}
export async function serviceDuplicates(tx: Prisma.TransactionClient, company: string, courseIds: string[], dates: Date[], exclude?: string, sessions?: {date:Date;courseIds?:string[]}[]) {
  if (!dates.length) return [];
  // Serialize same-customer writes across overlapping dates, avoiding simultaneous silent duplicates.
  for (const day of dates) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`duplicate:${customerKey(company)}:${day.toISOString().slice(0,10)}`}))::text`;
  const rows = await tx.service.findMany({ where: { deletedAt: null, ...(exclude ? { id: { not: exclude } } : {}), AND: [
    { OR: dates.flatMap(day => { const start = new Date(day.toISOString().slice(0,10)+"T00:00:00Z"), end = new Date(start.getTime()+86400000); return [{serviceDate:{gte:start,lt:end}},{dates:{some:{date:{gte:start,lt:end}}}}]; }) },
    { OR: [{ courseId: { in: courseIds } }, { courses: { some: { id: { in: courseIds } } } }] }
  ] }, include:{dates:true,courses:true} });
  return rows.filter(row=>customerKey(row.company)===customerKey(company)).flatMap(row=>{
    const booked = row.dates?.length ? row.dates : row.serviceDate ? [{date:row.serviceDate,courseIds:[]}] : [];
    const general = row.courses?.length ? row.courses : [{id:row.courseId}];
    const requested = sessions ?? dates.map(date=>({date,courseIds}));
    const overlap = requested.find(day=>booked.some(other=>other.date.toISOString().slice(0,10)===day.date.toISOString().slice(0,10) && assignedItems(general,other.courseIds).some(course=>(day.courseIds?.length?day.courseIds:courseIds).includes(course.id))));
    return overlap ? [{id:row.id,name:row.company,date:overlap.date.toISOString().slice(0,10),amount:row.amount.toString()}] : [];
  });
}
export async function saleDuplicates(tx: Prisma.TransactionClient, name: string, courseIds: string[], date: Date, exclude?: string) {
  const day = date.toISOString().slice(0,10);
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`duplicate-sale:${customerKey(name)}:${day}`}))::text`;
  const rows = await tx.certificateSale.findMany({ where: { deletedAt: null, OR:[{courseId:{in:courseIds}},{courses:{some:{id:{in:courseIds}}}}], ...(exclude ? { id: { not: exclude } } : {}), saleDate: { gte: new Date(day+'T00:00:00Z'), lt: new Date(Date.parse(day+'T00:00:00Z')+86400000) } } });
  return rows.filter(r => customerKey(r.customerName) === customerKey(name)).map(r => ({ id: r.id, name: r.customerName, date: day, amount: r.amount.toString() }));
}
