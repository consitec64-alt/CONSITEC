export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceDate, InvalidRecord } from "@/lib/record-input";
import { recordError } from "@/lib/record-error";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const sctrStartsAt = invoiceDate(body?.sctrStartsAt);
    const sctrEndsAt = invoiceDate(body?.sctrEndsAt);
    if (!sctrStartsAt || !sctrEndsAt || sctrEndsAt < sctrStartsAt) throw new InvalidRecord("Ingresa inicio y fin válidos; el fin no puede ser anterior al inicio");
    const { id } = await params;
    const result = await prisma.instructor.updateMany({ where: { id, sctr: true }, data: { sctrStartsAt, sctrEndsAt } });
    if (!result.count) {
      const instructor = await prisma.instructor.findUnique({ where: { id }, select: { id: true } });
      return NextResponse.json({ error: instructor ? "Primero marca SCTR como Sí en la ficha del instructor" : "El instructor ya no existe" }, { status: instructor ? 409 : 404 });
    }
    return NextResponse.json({ message: "Vigencia SCTR guardada" });
  } catch (error) { return recordError(error); }
}
