export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { saleInput, InvalidRecord } from "@/lib/record-input";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); }
  try {
    const { id } = await params;
    const updated = await prisma.certificateSale.update({ where: { id }, data: saleInput(body), include: { course: true, salesperson: true } });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvalidRecord) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "La venta ya no existe" }, { status: 404 });
      if (error.code === "P2003") return NextResponse.json({ error: "El curso o comercial ya no existe" }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo editar la venta" }, { status: 503 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.certificateSale.delete({ where: { id } });
    return NextResponse.json({ message: "Venta eliminada" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error eliminando la venta", error }, { status: 500 });
  }
}
