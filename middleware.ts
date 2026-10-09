import { NextResponse, type NextRequest } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function middleware(req: NextRequest) {
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  if (isApi && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== req.headers.get("host")) {
          return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
      }
    }
  }
  if (req.nextUrl.pathname === "/api/auth/login" || req.nextUrl.pathname === "/api/maintenance/trash") return NextResponse.next();
  const session = await getSession(req.cookies.get(SESSION_COOKIE)?.value);
  let user = null;
  if (session) {
    try {
      user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role:true, mustChangePassword:true, sessionVersion:true } });
    } catch {
      return NextResponse.json({ error: "Servicio temporalmente no disponible" }, { status: 503 });
    }
  }
  if (user && user.sessionVersion !== (session?.sessionVersion ?? 0)) user=null;
  if (!user) {
    return isApi
      ? NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }
  const personal = ["/api/auth/logout","/api/auth/tutorial","/api/profile"].includes(req.nextUrl.pathname);
  if (isApi && user.mustChangePassword && !personal && req.nextUrl.pathname!=="/api/auth/me") return NextResponse.json({error:"Cambia tu contraseña temporal para continuar",code:"PASSWORD_CHANGE_REQUIRED"},{status:403});
  if (user.role === "SUPERVISOR") {
    const path = req.nextUrl.pathname;
    if (!isApi && path !== '/dashboard') return NextResponse.redirect(new URL('/dashboard', req.url));
    const registerWrite = path === '/api/instructor-register' && req.method === 'PATCH';
    const allowedRead = ['/api/auth/me','/api/dashboard','/api/services','/api/instructor-register','/api/metadata/instructors','/api/metadata/courses','/api/metadata/locations'].includes(path) || (path === '/api/record-profile' && req.nextUrl.searchParams.get('entity') === 'SERVICE');
    if (isApi && !personal && !registerWrite && (!allowedRead || !['GET','HEAD','OPTIONS'].includes(req.method))) return NextResponse.json({error:'El supervisor solo tiene acceso a vista general, agenda y registro de instructores'},{status:403});
  }
  const response = NextResponse.next();
  if (isApi) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/api/:path*"], runtime: "nodejs" };
