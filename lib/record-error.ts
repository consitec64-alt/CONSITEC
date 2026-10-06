import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { InvalidRecord } from "@/lib/record-input";
import { InstructorUnavailable } from "@/lib/service-scheduling";
export function recordError(error: unknown) {
  if (error instanceof InstructorUnavailable) return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof InvalidRecord || error instanceof SyntaxError) return NextResponse.json({ error: error instanceof InvalidRecord ? error.message : "Solicitud inválida" }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return NextResponse.json({ error: "El registro ya no existe" }, { status: 404 });
    if (error.code === "P2002") return NextResponse.json({ error: "Ya existe un registro con ese nombre" }, { status: 409 });
    if (error.code === "P2003") return NextResponse.json({ error: "Revisa el curso, comercial, instructor y ubicación" }, { status: 400 });
  }
  return NextResponse.json({ error: "No se pudo guardar el registro" }, { status: 503 });
}
