import { removeCatalog } from "@/lib/audited-write";
import { recordError } from "@/lib/record-error";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {

  try { await removeCatalog("COURSE", (await params).id); return NextResponse.json({ message: "Registro eliminado" }); }
  catch (error) { return recordError(error); }
}
