import { assignedSalesperson } from "@/lib/assigned-salesperson";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invoiceDateFor } from "@/lib/invoice-date";
import { serviceInput, InvalidRecord } from "@/lib/record-input";

export const serviceInclude = { course: true, courses: { orderBy: { name: "asc" as const } }, instructor: true, location: true, salesperson: true, dates: { orderBy: { date: "asc" as const } } };
export function agendaWhere(start: Date, end: Date): Prisma.ServiceWhereInput {
  return { OR: [{ serviceDate: { gte: start, lt: end } }, { dates: { some: { date: { gte: start, lt: end } } } }] };
}
export function datesWhere(days: Date[]): Prisma.ServiceWhereInput {
  return { OR: days.flatMap(day => {
    const start = new Date(day.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const end = new Date(start.getTime() + 86400000);
    return [{ serviceDate: { gte: start, lt: end } }, { dates: { some: { date: { gte: start, lt: end } } } }];
  }) };
}
export class InstructorUnavailable extends Error {}
export async function writeService(body: Record<string, unknown>, id?: string, userId?: string) {
  const { dates, sessions, courseIds, requestedInvoiceDate, ...data } = serviceInput(body);
  return prisma.$transaction(async tx => {
    if (id) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
    const existing = id ? await tx.service.findUniqueOrThrow({ where: { id } }) : undefined;
    if (await tx.course.count({ where: { id: { in: courseIds } } }) !== courseIds.length) throw new InvalidRecord("Uno de los cursos seleccionados ya no existe");
    const salespersonId = existing?.salespersonId ?? await assignedSalesperson(tx, userId);
    const invoicedAt = invoiceDateFor(data.status, requestedInvoiceDate, existing);
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
    if (id) return tx.service.update({ where: { id }, data: { ...data, salespersonId, invoicedAt, courses: { set: courseIds.map(id => ({ id })) }, dates: { deleteMany: {}, create: sessions } }, include: serviceInclude });
    return tx.service.create({ data: { ...data, salespersonId, invoicedAt, courses: { connect: courseIds.map(id => ({ id })) }, dates: { create: sessions } }, include: serviceInclude });
  });
}
