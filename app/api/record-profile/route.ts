import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { quotationOwner } from '@/lib/quotations';

export const dynamic = 'force-dynamic';
const roles: Record<string, string> = { ADMIN: 'Administrador', SALES: 'Vendedor', SUPERVISOR: 'Supervisor' };

// Resolve a profile through a visible record, never through an arbitrary user id.
export async function GET(req: Request) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const entity = params.get('entity'), id = params.get('id');
  if (!id || id.length > 100 || !['SERVICE', 'CERTIFICATE', 'QUOTATION', 'HISTORY'].includes(entity || '')) {
    return NextResponse.json({ error: 'Registro inválido' }, { status: 400 });
  }
  let recordId = id, source = entity, commercial: string | null = null;
  let event;
  if (entity === 'HISTORY') {
    const scope = actor.role === 'SALES' ? { OR: [{ salespersonId: actor.salespersonId || '__unassigned__' }, { actorId: actor.id }] } : {};
    event = await prisma.auditLog.findFirst({ where: { id, ...scope } });
    if (!event) return NextResponse.json({ error: 'Registro no disponible' }, { status: 404 });
  } else {
    if (entity === 'QUOTATION') {
      const row = await prisma.quotation.findFirst({ where: { id, ...quotationOwner(actor) }, select: { salesperson: { select: { name: true } } } });
      if (!row) return NextResponse.json({ error: 'Registro no disponible' }, { status: 404 });
      commercial = row.salesperson.name;
    } else if (entity === 'CERTIFICATE') {
      const row = await prisma.certificateSale.findFirst({ where: { id, deletedAt: null }, select: { salesperson: { select: { name: true } } } });
      if (!row) return NextResponse.json({ error: 'Registro no disponible' }, { status: 404 });
      commercial = row.salesperson.name;
    } else {
      const row = await prisma.service.findFirst({ where: { id, deletedAt: null }, select: { certificateSaleId: true, salesperson: { select: { name: true } } } });
      if (!row) return NextResponse.json({ error: 'Registro no disponible' }, { status: 404 });
      commercial = row.salesperson.name;
      // An agenda copy represents the original certificate sale, not its later editor.
      if (row.certificateSaleId) { recordId = row.certificateSaleId; source = 'CERTIFICATE'; }
    }
    event = await prisma.auditLog.findFirst({ where: { entity: source!, recordId, action: 'CREATE' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  }
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!event) return NextResponse.json({ state: 'unknown', commercial, name: 'Autor no registrado', avatar: null, role: null, registeredAt: null }, { headers });
  const user = await prisma.user.findUnique({ where: { id: event.actorId }, select: { displayName: true, avatar: true, role: true, salesperson: { select: { name: true } } } });
  // Login email, password, preferences and security fields are intentionally excluded.
  return NextResponse.json({ state: user ? 'active' : 'deleted', name: user ? user.displayName || user.salesperson?.name || roles[user.role] || 'Integrante del equipo' : 'Cuenta eliminada', avatar: user?.avatar ?? null, role: user ? roles[user.role] || 'Integrante del equipo' : null, commercial, registeredAt: event.createdAt }, { headers });
}
