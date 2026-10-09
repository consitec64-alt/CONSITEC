import { quotationOwner, lockQuotation, QuotationError } from "@/lib/quotations";
import { assertMonthsOpen } from '@/lib/monthly-close';
import { audit } from "@/lib/audit";
import { currentUser } from "@/lib/current-user";
import { serviceDuplicates, PossibleDuplicate } from "@/lib/duplicates";
import { assignedSalesperson } from "@/lib/assigned-salesperson";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invoiceDateFor } from "@/lib/invoice-date";
import { serviceInput, InvalidRecord } from "@/lib/record-input";

export const serviceInclude = { course: true, courses: { orderBy: { name: "asc" as const } }, instructor: true, location: true, salesperson: true, dates: { orderBy: { date: "asc" as const } } };
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
export async function writeService(body: Record<string, unknown>, id?: string, userId?: string, quotationId?: string) {
  const actor = await currentUser();
  if (!actor) throw new InvalidRecord("Debes iniciar sesión");
  return prisma.$transaction(async tx => {
    const quotation = quotationId ? (await lockQuotation(tx, quotationId), await tx.quotation.findFirstOrThrow({where:{id:quotationId,...quotationOwner(actor)},include:{courses:true}})) : null;
    if (quotation?.serviceId) return tx.service.findUniqueOrThrow({where:{id:quotation.serviceId},include:serviceInclude});
    if (quotation?.convertedAt) throw new QuotationError('Esta cotización ya generó un servicio; el registro original fue eliminado definitivamente',409);
    if (quotation && quotation.status !== 'ACCEPTED') throw new QuotationError('Primero marca la cotización como Aceptada',409);
    if (quotation) body = {...body,company:quotation.company,amount:String(quotation.amount),courseIds:quotation.courses.map(c=>c.id),modality:quotation.modality ?? body.modality,certificatesOnly:false,status:'SCHEDULED'};
    const { dates, sessions, courseIds, requestedInvoiceDate, ...data } = serviceInput(body);
    if (id) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
    const existing = id ? await tx.service.findUniqueOrThrow({ where: { id, deletedAt: null }, include: serviceInclude }) : undefined;
    if (await tx.course.count({ where: { id: { in: courseIds } } }) !== courseIds.length) throw new InvalidRecord("Uno de los cursos seleccionados ya no existe");
    const salespersonId = existing?.salespersonId ?? quotation?.salespersonId ?? await assignedSalesperson(tx, userId);
    const duplicates = await serviceDuplicates(tx, data.company, courseIds, dates, id);
    const invoicedAt = invoiceDateFor(data.status, requestedInvoiceDate, existing);
    await assertMonthsOpen(tx, existing, { ...data, dates: sessions, invoicedAt });
    if (data.instructorId) {
      // Serialize bookings for this instructor before checking every selected day.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${data.instructorId}))::text`;
      const conflict = await tx.service.findFirst({
        where: { ...datesWhere(dates), instructorId: data.instructorId, ...(id ? { id: { not: id } } : {}) },
        include: { instructor: true, dates: true }
      });
      if (conflict) {
        const booked = new Set([conflict.serviceDate, ...conflict.dates.map(d => d.date)].map(d => d.toISOString().slice(0, 10)));
        const occupied = dates.filter(d => booked.has(d.toISOString().slice(0, 10))).map(d => d.toISOString().slice(0, 10)).join(", ");
        throw new InstructorUnavailable(`${conflict.instructor?.name || "El instructor"} no está disponible para la fecha: ${occupied}`);
      }
    }
    if (duplicates.length && body.allowDuplicate !== true) throw new PossibleDuplicate(duplicates);
    const saved = id ? await tx.service.update({ where: { id }, data: { ...data, salespersonId, invoicedAt, courses: { set: courseIds.map(id => ({ id })) }, dates: { deleteMany: {}, create: sessions } }, include: serviceInclude })
    : await tx.service.create({ data: { ...data, salespersonId, invoicedAt, courses: { connect: courseIds.map(id => ({ id })) }, dates: { create: sessions } }, include: serviceInclude });
    await audit(tx, actor, "SERVICE", id ? "UPDATE" : "CREATE", existing, saved);
    if (quotation) {
      const after = await tx.quotation.update({where:{id:quotation.id},data:{serviceId:saved.id,convertedAt:new Date()},include:{courses:true,salesperson:true}});
      await audit(tx,actor,'QUOTATION','UPDATE',quotation,after);
    }
    return saved;
  });
}
