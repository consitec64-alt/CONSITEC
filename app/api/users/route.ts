import { auditedWrite } from "@/lib/audited-write";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const fields = { id: true, username: true, role: true, salespersonId: true, salesperson: { select: { id: true, name: true } } } as const;
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
    const { email, password, role, salespersonId } = body ?? {};
    const username = normalizeEmail(email);
    if (!username) return response({ error: "Ingresa un correo electrónico válido" }, 400);
    if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password) > 72) {
      return response({ error: "La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes" }, 400);
    }
    if (role !== "ADMIN" && role !== "SALES" && role !== "REPORTS") return response({ error: "Selecciona un rol válido" }, 400);
    if (role !== "REPORTS" && (typeof salespersonId !== "string" || !salespersonId || !await prisma.salesperson.findUnique({ where: { id: salespersonId } }))) return response({ error: "Selecciona un comercial existente para esta cuenta" }, 400);
    const hashed = await bcrypt.hash(password, 12);
    const user = await auditedWrite("USER", undefined, tx => tx.user.create({
      data: { username, password: hashed, role, salespersonId: role === "REPORTS" ? null : salespersonId }, select: fields
    }));
    return response(user, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return response({ error: "Ese correo electrónico ya está registrado" }, 409);
    }
    return response({ error: "No se pudo crear el usuario" }, 503);
  }
}

export async function PATCH(req: Request) {
  try {
    const denied = await authorize();
    if (denied) return denied;
    let body;
    try { body = await req.json(); } catch { return response({ error: "Solicitud inválida" }, 400); }
    const { id, email, salespersonId } = body ?? {};
    const username = email === undefined ? undefined : normalizeEmail(email);
    if (typeof id !== "string" || !id || id.length > 100 || (email !== undefined && !username) || (email === undefined && salespersonId === undefined)) {
      return response({ error: "Selecciona una cuenta e ingresa un correo electrónico válido" }, 400);
    }
    const target = typeof id === "string" ? await prisma.user.findUnique({where:{id},select:{role:true}}) : null;
    if(target?.role === "REPORTS" && salespersonId !== undefined)return response({error:"Las cuentas de informes no tienen comercial asignado"},400);
    if (salespersonId !== undefined && (typeof salespersonId !== "string" || !salespersonId || !await prisma.salesperson.findUnique({ where: { id: salespersonId } }))) return response({ error: "Selecciona un comercial existente para esta cuenta" }, 400);
    return response(await auditedWrite("USER", id, tx => tx.user.update({ where: { id }, data: { ...(username ? { username } : {}), ...(salespersonId !== undefined ? { salespersonId } : {}) }, select: fields })));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return response({ error: "Ese correo electrónico ya está registrado" }, 409);
      if (error.code === "P2025") return response({ error: "La cuenta ya no existe" }, 404);
    }
    return response({ error: "No se pudo actualizar el correo" }, 503);
  }
}
