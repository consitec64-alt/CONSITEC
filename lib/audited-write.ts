import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';
import { audit } from '@/lib/audit';
import { InvalidRecord } from '@/lib/record-input';
const models = { USER:'user', COURSE:'course', INSTRUCTOR:'instructor', LOCATION:'location', SALESPERSON:'salesperson' } as const;
export async function auditedWrite<T>(entity: keyof typeof models, id: string | undefined, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  const actor = await currentUser(); if (!actor) throw new InvalidRecord('Debes iniciar sesión');
  return prisma.$transaction(async tx => {
    if (id) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`catalog:${entity}:${id}`}))::text`;
    const model = tx[models[entity]] as unknown as { findUnique(args: { where: { id: string }; include?: Record<string,unknown> }): Promise<unknown> };
    const include = entity === "USER" ? { salesperson: { select: { id: true, name: true } } } : entity === "INSTRUCTOR" ? { courses: true } : undefined;
    const before = id ? await model.findUnique({ where: { id }, ...(include ? { include } : {}) }) : null;
    const after = await operation(tx);
    await audit(tx, actor, entity, id ? 'UPDATE' : 'CREATE', before, after);
    return after;
  });
}
export async function removeCatalog(entity: Exclude<keyof typeof models,'USER'>, id: string) {
  const actor = await currentUser(); if (!actor) throw new InvalidRecord('Debes iniciar sesión');
  return prisma.$transaction(async tx => {
    const model = tx[models[entity]] as unknown as { findUniqueOrThrow(args:{where:{id:string}}):Promise<unknown>;delete(args:{where:{id:string}}):Promise<unknown> };
    const before = await model.findUniqueOrThrow({where:{id}});
    const where: Prisma.ServiceWhereInput = entity==='COURSE' ? {OR:[{courseId:id},{courses:{some:{id}}}]} : entity==='LOCATION'?{locationId:id}:entity==='INSTRUCTOR'?{instructorId:id}:{salespersonId:id};
    const used = await tx.service.count({where}) + (entity==='COURSE' || entity==='SALESPERSON' ? await tx.certificateSale.count({where:entity==='COURSE'?{courseId:id}:{salespersonId:id}}):0) + (entity==='SALESPERSON' ? await tx.user.count({where:{salespersonId:id}}):0);
    if (used) throw new InvalidRecord('No se puede eliminar: está vinculado a servicios, ventas o cuentas. Conserva el catálogo para proteger los registros y su recuperación.');
    await model.delete({where:{id}});
    await audit(tx, actor, entity, 'DELETE', before, null);
  });
}
