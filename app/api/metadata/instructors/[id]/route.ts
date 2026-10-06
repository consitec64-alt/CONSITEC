export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { instructorInput } from "@/lib/record-input";
import { recordError } from "@/lib/record-error";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    await prisma.instructor.delete({ where: { id } });
    return NextResponse.json({ message: "Instructor eliminado" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error eliminando instructor", error }, { status: 500 });
  }
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await prisma.instructor.update({ where: { id: (await params).id }, data: instructorInput(await req.json()) })); }
  catch (error) { return recordError(error); }
}
