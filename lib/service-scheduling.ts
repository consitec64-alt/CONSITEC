import { assignedInstructorSessions, assignedItems, assignmentKey } from '@/lib/date-assignments';
import { bookedSessions, conflictingDays, type InstructorSession } from '@/lib/instructor-availability';
import { scheduledServiceStatus } from "@/lib/service-status";
import { quotationOwner, lockQuotation, QuotationError } from "@/lib/quotations";
import { assertMonthsOpen } from '@/lib/monthly-close';
import { audit } from "@/lib/audit";
import { currentUser } from "@/lib/current-user";
import { serviceDuplicates, PossibleDuplicate } from "@/lib/duplicates";
import { recordSalesperson } from "@/lib/assigned-salesperson";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invoiceDateFor } from "@/lib/invoice-date";
import { serviceInput, InvalidRecord } from "@/lib/record-input";

export const serviceInclude = { course: true, courses: { orderBy: { name: "asc" as const } }, instructor: true, instructors: { orderBy: { name: "asc" as const } }, location: true, salesperson: true, dates: { orderBy: { date: "asc" as const } } };
export function agendaWhere(start: Date, end: Date): Prisma.ServiceWhereInput {
  return { deletedAt: null, OR: [{ serviceDate: { gte: start, lt: end } }, { dates: { some: { date: { gte: start, lt: end } } } }] };
}
export function datesWhere(days: Date[]): Prisma.ServiceWhereInput {
  return { deletedAt: null, OR: days.flatMap(day => {
    const start = new Date(day.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const end = new Date(start.getTime() + 86400000);
    return [{ serviceDate: { gte: start, lt: end } }, { dates: { some: { date: { gte: start, lt: end } } } }];
  }) };
}
export class InstructorUnavailable extends Error {}
export class ImportedServiceInTrash extends Error {}
export async function assertInstructorsAvailable(tx: Prisma.TransactionClient, instructorIds: string[], sessions: InstructorSession[], exclude?: string) {
  if (!sessions.length) return;
  // Lock in a consistent order to prevent deadlocks for overlapping teams.
  for (const instructorId of [...instructorIds].sort()) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${instructorId}))::text`;
  }
  for (const instructorId of instructorIds) {
    const requested = assignedInstructorSessions(sessions, instructorId);
    if (!requested.length) continue;
    const bookings = await tx.service.findMany({
      where: { AND: [datesWhere(requested.map(session => session.date)), { OR: [{instructorId}, {instructors:{some:{id:instructorId}}}] }], ...(exclude ? {id:{not:exclude}} : {}) },
      include: {dates:true}
    });
    const occupied = conflictingDays(requested, bookings.flatMap(booking => assignedInstructorSessions(bookedSessions(booking), instructorId)));
    if (occupied.length) {
      const instructor = await tx.instructor.findUnique({where:{id:instructorId}});
      throw new InstructorUnavailable(`${instructor?.name || 'El instructor'} no está disponible en el horario solicitado para: ${occupied.join(', ')}`);
    }
  }
}
export async function writeService(body: Record<string, unknown>, id?: string, userId?: string, quotationId?: string, source?: { key: string; location: string | null }) {
  const actor = await currentUser();
  if (!actor || actor.role === "SUPERVISOR") throw new InvalidRecord("Debes iniciar sesión");
  return prisma.$transaction(async tx => {
    const quotation = quotationId ? (await lockQuotation(tx, quotationId), await tx.quotation.findFirstOrThrow({where:{id:quotationId,...quotationOwner(actor)},include:{courses:true}})) : null;
    if (quotation?.serviceId) return tx.service.findUniqueOrThrow({where:{id:quotation.serviceId},include:serviceInclude});
    if (quotation?.convertedAt) throw new QuotationError('Esta cotización ya generó un servicio; el registro original fue eliminado definitivamente',409);
    if (quotation && quotation.status !== 'ACCEPTED') throw new QuotationError('Primero marca la cotización como Aceptada',409);
    if (quotation) body = {...body,company:quotation.company,amount:String(quotation.amount),courseIds:quotation.courses.map(c=>c.id),modality:quotation.modality ?? body.modality,certificatesOnly:false,status:'SCHEDULED'};
    const { dates, sessions, courseIds, instructorIds, requestedInvoiceDate, ...data } = serviceInput(body);
    if (source) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`service-import:${source.key}`}))::text`;
      const imported = await tx.service.findUnique({where:{importKey:source.key},include:serviceInclude});
      if (imported?.deletedAt) throw new ImportedServiceInTrash('Esta fila ya fue importada y está en la papelera. Restaura el servicio antes de volver a importarla.');
      if (imported) return imported;
    }
    if (!data.certificatesOnly) data.status = scheduledServiceStatus(data.status, dates) as typeof data.status;
    if (id) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
    const existing = id ? await tx.service.findUniqueOrThrow({ where: { id, deletedAt: null }, include: serviceInclude }) : undefined;
    if (await tx.course.count({ where: { id: { in: courseIds } } }) !== courseIds.length) throw new InvalidRecord("Uno de los cursos seleccionados ya no existe");
    if(existing?.certificateSaleId)throw new InvalidRecord('Edita la venta vinculada desde Venta de certificados');
    const salespersonId = quotation?.salespersonId ?? await recordSalesperson(tx, actor, body.salespersonId, existing?.salespersonId);
    const duplicates = await serviceDuplicates(tx, data.company, courseIds, dates, id, sessions);
    const invoicedAt = invoiceDateFor(data.status, requestedInvoiceDate, existing);
    await assertMonthsOpen(tx, existing, { ...data, dates: sessions, invoicedAt });
    if (await tx.instructor.count({where:{id:{in:instructorIds}}}) !== instructorIds.length) throw new InvalidRecord('Uno de los instructores seleccionados ya no existe');
    await assertInstructorsAvailable(tx, instructorIds, sessions, id);
    if (duplicates.length && body.allowDuplicate !== true) throw new PossibleDuplicate(duplicates);
    const saved = id ? await tx.service.update({ where: { id }, data: { ...data, salespersonId, invoicedAt, instructors: {set:instructorIds.map(id=>({id}))}, courses: { set: courseIds.map(id => ({ id })) }, dates: { deleteMany: {}, create: sessions } }, include: serviceInclude })
    : await tx.service.create({ data: { ...data, ...(source ? {importKey:source.key,importedLocation:source.location} : {}), salespersonId, invoicedAt, instructors: {connect:instructorIds.map(id=>({id}))}, courses: { connect: courseIds.map(id => ({ id })) }, dates: { create: sessions } }, include: serviceInclude });
    if (existing) {
      const oldDays = existing.dates.length ? existing.dates : existing.serviceDate ? [{date:existing.serviceDate,courseIds:[],instructorIds:[]}] : [];
      const oldCourses = (existing.courses.length ? existing.courses : [existing.course]);
      const oldInstructors = existing.instructors.length ? existing.instructors : existing.instructor ? [existing.instructor] : [];
      const changed = oldDays.filter(day => {
        const next = sessions.find(row => row.date.toISOString().slice(0,10) === day.date.toISOString().slice(0,10));
        return !next || assignmentKey(assignedItems(oldCourses,day.courseIds).map(c=>c.id)) !== assignmentKey(next.courseIds.length?next.courseIds:courseIds) || assignmentKey(assignedItems(oldInstructors,day.instructorIds).map(i=>i.id)) !== assignmentKey(next.instructorIds.length?next.instructorIds:instructorIds);
      }).map(day=>day.date.toISOString().slice(0,10));
      if (changed.length) await tx.instructorConfirmation.deleteMany({where:{serviceId:existing.id,date:{in:changed}}});
    }
    await audit(tx, actor, "SERVICE", id ? "UPDATE" : "CREATE", existing, saved);
    if (quotation) {
      const after = await tx.quotation.update({where:{id:quotation.id},data:{serviceId:saved.id,convertedAt:new Date()},include:{courses:true,salesperson:true}});
      await audit(tx,actor,'QUOTATION','UPDATE',quotation,after);
    }
    return saved;
  });
}
