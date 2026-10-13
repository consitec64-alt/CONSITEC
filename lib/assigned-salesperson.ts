import { Prisma } from "@prisma/client";
export class AssignmentRequired extends Error {}
export async function assignedSalesperson(tx: Prisma.TransactionClient, userId: string | undefined) {
  const user = userId ? await tx.user.findUnique({ where: { id: userId }, select: { salespersonId: true } }) : null;
  if (!user?.salespersonId) throw new AssignmentRequired("Un administrador debe asignarte un comercial en Usuarios antes de registrar ventas o servicios");
  return user.salespersonId;
}

export async function recordSalesperson(tx: Prisma.TransactionClient, actor: {id:string;role:string}, requested: unknown, existing?: string | null) {
  if (actor.role !== "ADMIN") {
    if (existing !== undefined) return existing;
    return assignedSalesperson(tx, actor.id);
  }
  if (requested === undefined) return existing ?? null;
  if (requested === null || requested === "") return null;
  if (typeof requested !== "string" || !await tx.salesperson.findUnique({where:{id:requested}})) throw new AssignmentRequired("Selecciona un comercial válido");
  return requested;
}
