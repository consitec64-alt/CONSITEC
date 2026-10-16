import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';
import { invoiceDate, InvalidRecord } from '@/lib/record-input';
import { recordError } from '@/lib/record-error';
import { audit } from '@/lib/audit';
import { sctrSnapshot } from '@/lib/sctr';

export const dynamic = 'force-dynamic';
export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  if (actor.role === 'SUPERVISOR') return NextResponse.json({ error: 'No tienes acceso al SCTR' }, { status: 403 });
  try {
    const [policy, count] = await Promise.all([prisma.sctrPolicy.findUnique({ where: { id: 'shared' } }), prisma.instructor.count({ where: { sctr: true } })]);
    return NextResponse.json(sctrSnapshot(policy ? { sctrStartsAt: policy.sctrStartsAt.toISOString(), sctrEndsAt: policy.sctrEndsAt.toISOString() } : null, count), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return recordError(error); }
}
export async function PATCH(req: Request) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
    if (actor.role === 'SUPERVISOR') return NextResponse.json({ error: 'No puedes modificar el SCTR' }, { status: 403 });
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InvalidRecord('Solicitud inválida');
    const sctrStartsAt = invoiceDate(body.sctrStartsAt), sctrEndsAt = invoiceDate(body.sctrEndsAt);
    if (!sctrStartsAt || !sctrEndsAt || sctrEndsAt < sctrStartsAt) throw new InvalidRecord('Ingresa inicio y fin válidos; el fin no puede ser anterior al inicio');
    const saved = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'sctr:shared'}))::text`;
      const before = await tx.sctrPolicy.findUnique({ where: { id: 'shared' } });
      const after = await tx.sctrPolicy.upsert({ where: { id: 'shared' }, create: { sctrStartsAt, sctrEndsAt }, update: { sctrStartsAt, sctrEndsAt } });
      await audit(tx, actor, 'SCTR', before ? 'UPDATE' : 'CREATE', before ? { ...before, name: 'Póliza SCTR compartida' } : null, { ...after, name: 'Póliza SCTR compartida' });
      return after;
    });
    return NextResponse.json({ message: 'Vigencia SCTR compartida guardada', policy: saved });
  } catch (error) { return recordError(error); }
}
