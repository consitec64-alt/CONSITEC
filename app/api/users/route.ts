import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const fields = { id: true, username: true, role: true } as const;
const response = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" }
});

async function authorize() {
  const user = await currentUser();
  if (!user) return response({ error: "Debes iniciar sesión" }, 401);
  if (user.role !== "ADMIN") return response({ error: "Solo los administradores pueden gestionar usuarios" }, 403);
  return null;
}

export async function GET() {
  try {
    const denied = await authorize();
    if (denied) return denied;
    return response(await prisma.user.findMany({ select: fields, orderBy: { username: "asc" } }));
  } catch {
    return response({ error: "No se pudieron cargar los usuarios" }, 503);
  }
}

export async function POST(req: Request) {
  try {
    const denied = await authorize();
    if (denied) return denied;
    let body;
    try { body = await req.json(); } catch { return response({ error: "Solicitud inválida" }, 400); }
    const { username, password, role } = body ?? {};
    if (typeof username !== "string" || !/^[a-zA-Z0-9._-]{3,100}$/.test(username.trim())) {
      return response({ error: "El usuario debe tener entre 3 y 100 caracteres: letras, números, punto, guion o guion bajo" }, 400);
    }
    if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password) > 72) {
      return response({ error: "La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes" }, 400);
    }
    if (role !== "ADMIN" && role !== "SALES") return response({ error: "Selecciona un rol válido" }, 400);
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username: username.trim(), password: hashed, role }, select: fields
    });
    return response(user, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return response({ error: "Ese nombre de usuario ya existe" }, 409);
    }
    return response({ error: "No se pudo crear el usuario" }, 503);
  }
}
