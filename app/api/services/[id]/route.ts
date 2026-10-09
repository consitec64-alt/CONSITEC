export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { trashRecord } from "@/lib/trash";
import { writeService } from "@/lib/service-scheduling";
import { currentUser } from "@/lib/current-user";
import { recordError } from "@/lib/record-error";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await writeService(await req.json(), (await params).id, (await currentUser())?.id)); }
  catch (error) { return recordError(error); }
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await currentUser(); if (!actor) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 }); await trashRecord("SERVICE", (await params).id, actor); return NextResponse.json({ message: "Servicio enviado a la papelera durante 7 días" }); }
  catch (error) { return recordError(error); }
}
