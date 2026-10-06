import { NextResponse, type NextRequest } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/auth";

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
  if (req.nextUrl.pathname === "/api/auth/login") return NextResponse.next();
  const session = await getSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return isApi
      ? NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }
  const response = NextResponse.next();
  if (isApi) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
