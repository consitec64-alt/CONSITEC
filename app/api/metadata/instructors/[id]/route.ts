import { removeCatalog } from "@/lib/audited-write";
import { auditedWrite } from "@/lib/audited-write";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { instructorInput } from "@/lib/record-input";
import { recordError } from "@/lib/record-error";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {

  try { await removeCatalog("INSTRUCTOR", (await params).id); return NextResponse.json({ message: "Registro eliminado" }); }
  catch (error) { return recordError(error); }
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await auditedWrite("INSTRUCTOR", (await params).id, async tx => tx.instructor.update({ where: { id: (await params).id }, data: instructorInput(await req.json()), include: { courses: true } }))); }
  catch (error) { return recordError(error); }
}
