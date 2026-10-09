import { assertMonthsOpen } from '@/lib/monthly-close';
export const dynamic = "force-dynamic";

import { audit } from "@/lib/audit";
import { currentUser } from "@/lib/current-user";
import { trashRecord } from "@/lib/trash";
import { saleDuplicates, PossibleDuplicate } from "@/lib/duplicates";
import { recordError } from "@/lib/record-error";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { invoiceDateFor } from "@/lib/invoice-date";
import { saleInput, InvalidRecord } from "@/lib/record-input";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); }
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
    const { id } = await params;
    const { requestedInvoiceDate, ...data } = saleInput(body);
    const updated = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
      const existing = await tx.certificateSale.findUniqueOrThrow({ where: { id, deletedAt: null }, include: { course: true, salesperson: true } });
      const invoicedAt=invoiceDateFor(data.status, requestedInvoiceDate, existing);
      await assertMonthsOpen(tx,existing,{...data,invoicedAt});
      const duplicates = await saleDuplicates(tx, data.customerName, data.courseId, data.saleDate, id);
      if (duplicates.length && body.allowDuplicate !== true) throw new PossibleDuplicate(duplicates);
      const saved = await tx.certificateSale.update({ where: { id }, data: { ...data, invoicedAt }, include: { course: true, salesperson: true } });
      await audit(tx, actor, "CERTIFICATE", "UPDATE", existing, saved);
      return saved;
    });
    return NextResponse.json(updated);
  } catch (error) { return recordError(error); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser(); if (!actor) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
    await trashRecord("CERTIFICATE", (await params).id, actor);
    return NextResponse.json({ message: "Venta enviada a la papelera durante 7 días" });
  } catch (error) { return recordError(error); }
}
