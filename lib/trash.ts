import { cleanupQuotationFiles } from '@/lib/quotation-file-cleanup';
import { assertMonthsOpen } from '@/lib/monthly-close';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { audit, type Actor } from '@/lib/audit';
import { InvalidRecord } from '@/lib/record-input';
import { serviceInclude, assertInstructorsAvailable } from '@/lib/service-scheduling';
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const expiredBefore = () => new Date(Date.now() - RETENTION_MS);
export async function purgeExpired() {
  const deletedAt = { lte: expiredBefore() };
  await cleanupQuotationFiles();
  // Physical deletion only of records whose seven-day recovery window has ended.
  await prisma.$transaction([prisma.service.deleteMany({ where: { deletedAt } }), prisma.certificateSale.deleteMany({ where: { deletedAt } })]);
}
export async function trashRecord(entity: string, id: string, actor: Actor) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
    if (entity === 'SERVICE') {
      const before = await tx.service.findUniqueOrThrow({ where: { id, deletedAt: null }, include: serviceInclude });
      await assertMonthsOpen(tx,before);
      const after = await tx.service.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date() }, include: serviceInclude });
      await audit(tx, actor, entity, 'TRASH', before, after);
    } else {
      const before = await tx.certificateSale.findUniqueOrThrow({ where: { id, deletedAt: null }, include: { course: true, courses: true, salesperson: true } });
      await assertMonthsOpen(tx,before);
      const after = await tx.certificateSale.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date() }, include: { course: true, courses: true, salesperson: true } });
      await audit(tx, actor, entity, 'TRASH', before, after);
    }
  });
}
export async function restoreRecord(entity: string, id: string, actor: Actor) {
  if (!['SERVICE','CERTIFICATE'].includes(entity)) throw new InvalidRecord('Tipo de registro inválido');
  const owner = actor.role === 'ADMIN' ? {} : { salespersonId: actor.salespersonId || '__unassigned__' };
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
    const where = { id, ...owner, deletedAt: { gt: expiredBefore() } };
    if (entity === 'SERVICE') {
      const before = await tx.service.findFirstOrThrow({ where, include: serviceInclude });
      await assertMonthsOpen(tx,before);
      const instructorIds = [...new Set([before.instructorId,...before.instructors.map(i=>i.id)].filter((id):id is string=>!!id))];
      await assertInstructorsAvailable(tx, instructorIds, before.dates.length ? before.dates.map(d=>d.date) : [before.serviceDate], id);
      const after = await tx.service.update({ where: { id }, data: { deletedAt: null }, include: serviceInclude });
      await audit(tx, actor, entity, 'RESTORE', before, after); return after;
    }
    const before = await tx.certificateSale.findFirstOrThrow({ where, include: { course: true, courses: true, salesperson: true } });
    await assertMonthsOpen(tx,before);
    const after = await tx.certificateSale.update({ where: { id }, data: { deletedAt: null }, include: { course: true, courses: true, salesperson: true } });
    await audit(tx, actor, entity, 'RESTORE', before, after); return after;
  });
}
