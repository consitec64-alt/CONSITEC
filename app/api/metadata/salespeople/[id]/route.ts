export const dynamic = "force-dynamic";

import { adminOnly } from "@/lib/admin-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminOnly(); if (denied) return denied;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); }
  if (typeof body?.color !== "string" || !/^#[0-9a-f]{6}$/i.test(body.color)) {
    return NextResponse.json({ error: "Selecciona un color válido" }, { status: 400 });
  }
  try {
    const { id } = await params;
    const updated = await prisma.salesperson.update({ where: { id }, data: { color: body.color.toLowerCase() } });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "El comercial ya no existe" }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo guardar el color" }, { status: 503 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await adminOnly(); if (denied) return denied;
  try {
    const id = (await params).id;

    await prisma.service.deleteMany({
      where: { salespersonId: id }
    });

    await prisma.certificateSale.deleteMany({
      where: { salespersonId: id }
    });

    await prisma.salesperson.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Salesperson eliminado" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error eliminando" }, { status: 500 });
  }
}
