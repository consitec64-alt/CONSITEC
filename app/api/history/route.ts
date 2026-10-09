import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const actor = await currentUser(); if (!actor) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const page = Math.max(1, Math.min(10000, Number(q.get('page')) || 1));
  const scope = actor.role !== 'SALES' ? {} : { OR: [{ salespersonId: actor.salespersonId || '__unassigned__' }, { actorId: actor.id }] };
  const where = { ...scope, ...(q.get('search') ? { label: { contains: q.get('search')!.slice(0,200), mode: 'insensitive' as const } } : {}) };
  const [rows, total] = await Promise.all([prisma.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (Math.floor(page)-1)*30, take: 30 }), prisma.auditLog.count({ where })]);
  return NextResponse.json({ rows, total });
}
