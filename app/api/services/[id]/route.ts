export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeService } from "@/lib/service-scheduling";
import { recordError } from "@/lib/record-error";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await writeService(await req.json(), (await params).id)); }
  catch (error) { return recordError(error); }
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await prisma.service.delete({ where: { id: (await params).id } }); return NextResponse.json({ message: "Servicio eliminado" }); }
  catch (error) { return recordError(error); }
}
