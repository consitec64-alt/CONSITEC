import { Prisma } from '@prisma/client';
export type Actor = { id: string; username: string; role: string; salespersonId: string | null };
function snapshot(value: unknown): Prisma.InputJsonValue {
  // Never retain passwords, password hashes or session secrets, including nested values.
  return JSON.parse(JSON.stringify(value, (key, v) => /password|token|secret/i.test(key) ? undefined : v));
}
export async function audit(tx: Prisma.TransactionClient, actor: Actor, entity: string, action: string, before: unknown, after: unknown) {
  const row = (after ?? before) as { id: string; company?: string; customerName?: string; name?: string; username?: string; salespersonId?: string; district?: string };
  await tx.auditLog.create({ data: { actorId: actor.id, actorName: actor.username, entity, action, recordId: row.id,
    label: row.company ?? row.customerName ?? row.name ?? row.username ?? row.district ?? row.id,
    salespersonId: row.salespersonId ?? null, ...(before ? { before: snapshot(before) } : {}), ...(after ? { after: snapshot(after) } : {}) } });
}
