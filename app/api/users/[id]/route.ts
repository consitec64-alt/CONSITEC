import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const response = (body: unknown, status: number) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" }
});

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return response({ error: "Debes iniciar sesión" }, 401);
    if (actor.role !== "ADMIN") return response({ error: "Solo los administradores pueden eliminar usuarios" }, 403);
    const { id } = await params;
    if (!id || id.length > 100) return response({ error: "Cuenta inválida" }, 400);
    const result = await prisma.$transaction(async tx => {
      const active = await tx.user.findUnique({ where: { id: actor.id } });
      if (!active) return { status: 401, body: { error: "Debes iniciar sesión" } };
      if (active.role !== "ADMIN") return { status: 403, body: { error: "Solo los administradores pueden eliminar usuarios" } };
      if (id === actor.id) return { status: 409, body: { error: "No puedes eliminar tu propia cuenta" } };
      const target = await tx.user.findUnique({ where: { id } });
      if (!target) return { status: 404, body: { error: "La cuenta ya no existe" } };
      if (target.role === "ADMIN" && await tx.user.count({ where: { role: "ADMIN" } }) <= 1) {
        return { status: 409, body: { error: "Debe quedar al menos un administrador" } };
      }
      await tx.user.delete({ where: { id } });
      return { status: 200, body: { success: true } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return response(result.body, result.status);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2025"].includes(error.code)) {
      return response({ error: "Otra operación cambió esta cuenta. Actualiza la lista e inténtalo nuevamente" }, 409);
    }
    return response({ error: "No se pudo eliminar el usuario" }, 503);
  }
}
