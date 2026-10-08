import { NextResponse } from "next/server";
import { currentUser } from "@/lib/current-user";
import { tutorialSteps } from "@/lib/tutorial-steps";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const maxStep = tutorialSteps(user.role === "ADMIN").length - 1;
  if (!body || !Number.isInteger(body.step) || body.step < 0 || body.step > maxStep || typeof body.completed !== "boolean") {
    return NextResponse.json({ error: "Progreso inválido" }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { tutorialStep: body.step, tutorialCompleted: body.completed } });
  return NextResponse.json({ ok: true });
}
