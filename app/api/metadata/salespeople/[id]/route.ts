export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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