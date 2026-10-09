export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import { encodeSession, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { username, password } = (body ?? {}) as { username?: unknown; password?: unknown };
  if (typeof username !== "string" || typeof password !== "string" ||
      !username.trim() || username.length > 254 || !password || Buffer.byteLength(password) > 72) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 400 });
  }
  try {
    const identifier = normalizeEmail(username) ?? username.trim();
    const user = await prisma.user.findUnique({ where: { username: identifier } });
    // Reject legacy plaintext passwords; provision a hashed password with prisma:seed.
    const isHash = user && /^\$2[aby]\$\d{2}\$/.test(user.password);
    const hash = isHash ? user.password : "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
    const valid = await bcrypt.compare(password, hash);
    if (!user || !isHash || !valid) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    const token = await encodeSession({ userId: user.id, username: user.username, role: user.role, sessionVersion:user.sessionVersion });
    const res = NextResponse.json({ success: true });
    res.headers.set("Cache-Control", "no-store");
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: SESSION_SECONDS
    });
    return res;
  } catch (error) {
    console.error("Login failed", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 503 });
  }
}
