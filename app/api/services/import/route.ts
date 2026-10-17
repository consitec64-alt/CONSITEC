import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';
import { ImportedServiceInTrash, writeService } from '@/lib/service-scheduling';
import { InvalidRecord } from '@/lib/record-input';
import { recordError } from '@/lib/record-error';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  if (actor.role === 'SUPERVISOR') return NextResponse.json({ error: 'Solo tienes permisos de consulta' }, { status: 403 });
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.importKey !== 'string' || !/^excel:[a-f0-9]{64}:\d{1,3}:\d{1,7}:\d{4}$/.test(body.importKey)) throw new InvalidRecord('Identifica el archivo, la hoja, la fila y el año de la importación');
    if (!Array.isArray(body.sessions) || body.sessions.length !== 1) throw new InvalidRecord('Cada fila del Excel debe tener una fecha');
    if (body.importedLocation != null && (typeof body.importedLocation !== 'string' || body.importedLocation.trim().length > 200)) throw new InvalidRecord('Lugar del Excel inválido');
    if (typeof body.sessions[0]?.date !== 'string' || !body.importKey.endsWith(':' + body.sessions[0].date.slice(0,4))) throw new InvalidRecord('El año de la fila debe coincidir con su fecha');
    const previous = await prisma.service.findUnique({where:{importKey:body.importKey},select:{id:true}});
    const service = await writeService({ ...body, status: 'SCHEDULED', certificatesOnly: false, invoiceDate: '', amount: body.amount ?? 0 }, undefined, undefined, undefined, { key: body.importKey, location: body.importedLocation?.trim() || null });
    return NextResponse.json({ service, alreadyImported: previous?.id === service.id });
  } catch (error) {
    if (error instanceof ImportedServiceInTrash) return NextResponse.json({ error: error.message, code: 'IMPORT_IN_TRASH' }, { status: 409 });
    return recordError(error);
  }
}
