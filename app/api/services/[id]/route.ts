export const dynamic = "force-dynamic";

// app/api/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { serviceInput, InvalidRecord } from "@/lib/record-input";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); }
  try {
    const { id } = await params;
    const updated = await prisma.service.update({ where: { id }, data: serviceInput(body), include: { course: true, instructor: true, location: true, salesperson: true } });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvalidRecord) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "El servicio ya no existe" }, { status: 404 });
      if (error.code === "P2003") return NextResponse.json({ error: "Revisa el curso, comercial, instructor y ubicación" }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo editar el servicio" }, { status: 503 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ message: "Service eliminado" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error eliminando service", error }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const rep = searchParams.get("salespersonId") ?? undefined;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const services = await prisma.service.findMany({
    where: {
      serviceDate: { gte: start, lt: end },
      ...(rep ? { salespersonId: rep } : {})
    },
    include: { course: true, instructor: true, location: true, salesperson: true },
    orderBy: { serviceDate: "asc" }
  });

  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await prisma.service.create({
    data: {
      ...body,
      amount: body.amount,
      serviceDate: new Date(body.serviceDate)
    }
  });
  return NextResponse.json(created, { status: 201 });
}
