import { Prisma } from "@prisma/client";
export class AssignmentRequired extends Error {}
export async function assignedSalesperson(tx: Prisma.TransactionClient, userId: string | undefined) {
  const user = userId ? await tx.user.findUnique({ where: { id: userId }, select: { salespersonId: true } }) : null;
  if (!user?.salespersonId) throw new AssignmentRequired("Un administrador debe asignarte un comercial en Usuarios antes de registrar ventas o servicios");
  return user.salespersonId;
}
