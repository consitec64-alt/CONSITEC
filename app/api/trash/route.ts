import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { purgeExpired, expiredBefore, RETENTION_MS, restoreRecord } from '@/lib/trash';
import { recordError } from '@/lib/record-error';
export const dynamic = 'force-dynamic';
export async function GET() {
  const actor = await currentUser(); if (!actor) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  await purgeExpired();
  const where = { deletedAt: { gt: expiredBefore() }, ...(actor.role === 'ADMIN' ? {} : { salespersonId: actor.salespersonId || '__unassigned__' }) };
  const [services, sales] = await Promise.all([
    prisma.service.findMany({ where, include: { salesperson: true, course: true }, orderBy: { deletedAt: 'desc' } }),
    prisma.certificateSale.findMany({ where, include: { salesperson: true, course: true }, orderBy: { deletedAt: 'desc' } })
  ]);
  const rows = [...services.map(s => ({ entity: 'SERVICE', id: s.id, label: s.company, amount: s.amount.toString(), date: s.serviceDate, deletedAt: s.deletedAt!, salesperson: s.salesperson.name, course: s.course.name })),
    ...sales.map(s => ({ entity: 'CERTIFICATE', id: s.id, label: s.customerName, amount: s.amount.toString(), date: s.saleDate, deletedAt: s.deletedAt!, salesperson: s.salesperson.name, course: s.course.name }))]
    .map(s => ({ ...s, expiresAt: new Date(s.deletedAt.getTime()+RETENTION_MS) })).sort((a,b)=>b.deletedAt.getTime()-a.deletedAt.getTime());
  return NextResponse.json({ rows });
}
export async function POST(req: Request) {
  try {
    const actor = await currentUser(); if (!actor) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
    const body = await req.json();
    if (typeof body?.id !== 'string' || body.id.length>100) return NextResponse.json({ error:'Registro inválido' }, { status:400 });
    await restoreRecord(body.entity, body.id, actor);
    return NextResponse.json({ message: 'Registro restaurado' });
  } catch (error) { return recordError(error); }
}
