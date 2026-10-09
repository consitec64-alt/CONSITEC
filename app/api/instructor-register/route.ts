export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agendaWhere, serviceInclude } from "@/lib/service-scheduling";
import { invoiceDate, InvalidRecord } from "@/lib/record-input";
import { dayModality, modalityLabel } from "@/lib/class-modality";
import { classHours } from "@/lib/class-hours";
import { recordError } from "@/lib/record-error";
import { currentUser } from "@/lib/current-user";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
    const q = new URL(req.url).searchParams;
    const year = Number(q.get('year')), month = Number(q.get('month'));
    if (!Number.isInteger(year) || year < 1900 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) throw new InvalidRecord('Selecciona un mes y año válidos');
    const from = invoiceDate(q.get('from')), to = invoiceDate(q.get('to'));
    if (from && to && to < from) throw new InvalidRecord('La fecha final no puede ser anterior a la inicial');
    const periodStart = new Date(Date.UTC(year, month - 1, 1)), periodEnd = new Date(Date.UTC(year, month, 1));
    const start = from ? new Date(Math.max(periodStart.getTime(), Date.parse(from.toISOString().slice(0, 10)))) : periodStart;
    const end = to ? new Date(Math.min(periodEnd.getTime(), Date.parse(to.toISOString().slice(0, 10)) + 86400000)) : periodEnd;
    const value = (key: string, max = 100) => { const v = q.get(key)?.trim(); if (v && v.length > max) throw new InvalidRecord('Filtro inválido'); return v || undefined; };
    const instructorId = value('instructorId'), courseId = value('courseId'), company = value('company', 200), modality = value('modality');
    if (modality && modality !== 'VIRTUAL' && modality !== 'IN_PERSON' && modality !== 'MIXED') throw new InvalidRecord('Modalidad inválida');
    const services = await prisma.service.findMany({
      where: { AND: [agendaWhere(start, end), ...(courseId ? [{ OR: [{ courseId }, { courses: { some: { id: courseId } } }] }] : [])], certificatesOnly: false,
        ...(instructorId ? { OR:[{instructorId},{instructors:{some:{id:instructorId}}}] } : {}), ...(company ? { company: { contains: company, mode: 'insensitive' } } : {}), ...(modality ? { modality: { in: modality === 'MIXED' ? ['MIXED'] : [modality as 'VIRTUAL' | 'IN_PERSON', 'MIXED'] } } : {}) },
      include: { ...serviceInclude, registerConfirmations: { select: { date: true, instructorId: true, confirmed: true } } }, orderBy: [{ serviceDate: 'asc' }, { id: 'asc' }]
    });
    const confirmedIds = new Set(services.flatMap(s => s.registerConfirmations.filter(c => c.confirmed).map(c => `${s.id}:${c.date}:${c.instructorId}`)));
    const rows = services.flatMap(s => (s.dates.length ? s.dates : [{ date: s.serviceDate, startTime: null, endTime: null, modality: null }]).filter(d => d.date >= start && d.date < end && (!modality || modality === 'MIXED' || dayModality(s.modality, d.modality) === modality)).flatMap(d => (s.instructors.length ? s.instructors : s.instructor ? [s.instructor] : [{id:"unassigned",name:"Sin asignar"}]).filter(i=>!instructorId||i.id===instructorId).map(instructor => ({
      id: `${s.id}:${d.date.toISOString().slice(0, 10)}:${instructor.id}`, date: d.date.toISOString().slice(0, 10),
      serviceId: s.id, instructorId: instructor.id,
      confirmed: confirmedIds.has(`${s.id}:${d.date.toISOString().slice(0, 10)}:${instructor.id}`),
      instructor: instructor.name, company: s.company,
      courses: (s.courses.length ? s.courses : [s.course]).map(c => c.name),
      modality: modalityLabel(dayModality(s.modality, d.modality)),
      location: dayModality(s.modality, d.modality) === 'VIRTUAL' ? 'Virtual' : s.location ? `${s.location.department} / ${s.location.district}` : 'Sin registrar',
      instructionalMinutes: d.startTime && d.endTime ? classHours(d.startTime, d.endTime)?.instructionalMinutes ?? null : null
    })))).sort((a, b) => a.date.localeCompare(b.date) || a.instructor.localeCompare(b.instructor, 'es') || a.company.localeCompare(b.company, 'es') || a.id.localeCompare(b.id));
    return NextResponse.json({ rows, canConfirm: actor.role !== 'SUPERVISOR', canManageConfirmations: actor.role === 'ADMIN' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return recordError(error); }
}

export async function PATCH(req: Request) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
    if (actor.role !== 'ADMIN' && actor.role !== 'SALES') return NextResponse.json({ error: 'Acceso de consulta' }, { status: 403 });
    const body = await req.json();
    if (!body || typeof body.serviceId !== 'string' || !body.serviceId || body.serviceId.length > 100 || typeof body.instructorId !== 'string' || !body.instructorId || body.instructorId.length > 100 || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !invoiceDate(body.date) || typeof body.confirmed !== 'boolean') throw new InvalidRecord('Selecciona una jornada válida');
    if (actor.role !== 'ADMIN' && !body.confirmed) return NextResponse.json({ error: 'Solo un administrador puede quitar la confirmación' }, { status: 403 });
    const result = await prisma.$transaction(async tx => {
      // Same lock used by service edits/trash: validate the current row and save atomically.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${body.serviceId}))::text`;
      const service = await tx.service.findUniqueOrThrow({ where: { id: body.serviceId, deletedAt: null }, include: serviceInclude });
      const dates = service.dates.length ? service.dates.map(d => d.date) : [service.serviceDate];
      const instructors = service.instructors.length ? service.instructors : service.instructor ? [service.instructor] : [{ id: 'unassigned', name: 'Sin asignar' }];
      const instructor = instructors.find(i => i.id === body.instructorId);
      if (service.certificatesOnly || !instructor || !dates.some(d => d.toISOString().slice(0, 10) === body.date)) throw new InvalidRecord('La jornada ya no está disponible. Actualiza el registro.');
      const key = { serviceId: service.id, date: body.date as string, instructorId: instructor.id };
      const before = await tx.instructorConfirmation.findUnique({ where: { serviceId_date_instructorId: key } });
      if ((before?.confirmed ?? false) === body.confirmed) return { confirmed: body.confirmed as boolean };
      await tx.instructorConfirmation.upsert({ where: { serviceId_date_instructorId: key }, create: { ...key, confirmed: body.confirmed, updatedBy: actor.id }, update: { confirmed: body.confirmed, updatedBy: actor.id } });
      const snapshot = { id: `${service.id}:${key.date}:${key.instructorId}`, company: service.company, salespersonId: service.salespersonId, date: key.date, instructor: instructor.name };
      await audit(tx, actor, 'INSTRUCTOR_CONFIRMATION', body.confirmed ? 'CONFIRM' : 'UNCONFIRM', { ...snapshot, confirmed: before?.confirmed ?? false }, { ...snapshot, confirmed: body.confirmed });
      return { confirmed: body.confirmed as boolean };
    });
    return NextResponse.json(result);
  } catch (error) { return recordError(error); }
}
