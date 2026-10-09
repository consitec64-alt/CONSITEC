import { auditedWrite } from "@/lib/audited-write";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceDate, InvalidRecord } from "@/lib/record-input";
import { recordError } from "@/lib/record-error";

class SctrNotEnabled extends Error {}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const sctrStartsAt = invoiceDate(body?.sctrStartsAt);
    const sctrEndsAt = invoiceDate(body?.sctrEndsAt);
    if (!sctrStartsAt || !sctrEndsAt || sctrEndsAt < sctrStartsAt) throw new InvalidRecord("Ingresa inicio y fin válidos; el fin no puede ser anterior al inicio");
    const { id } = await params;
    const result = await auditedWrite("INSTRUCTOR", id, async tx => { const before = await tx.instructor.findUniqueOrThrow({ where: { id } }); if (!before.sctr) throw new SctrNotEnabled(); return tx.instructor.update({ where: { id: before.id, sctr: true }, data: { sctrStartsAt, sctrEndsAt } }); });
    return NextResponse.json({ message: "Vigencia SCTR guardada" });
  } catch (error) { if (error instanceof SctrNotEnabled) return NextResponse.json({ error: "Primero marca SCTR como Sí en la ficha del instructor" }, { status: 409 }); return recordError(error); }
}
