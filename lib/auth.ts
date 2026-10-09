import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE = "consitec_session";
export const SESSION_SECONDS = 60 * 60 * 8;
export type Session = { userId: string; username: string; role: "ADMIN" | "SALES" | "REPORTS" };

function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes");
  }
  return new TextEncoder().encode(secret);
}

export async function encodeSession(session: Session) {
  return new SignJWT({ username: session.username, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuer("consitec")
    .setAudience("consitec-panel")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(signingKey());
}

export async function getSession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"], issuer: "consitec", audience: "consitec-panel"
    });
    if (!payload.sub || typeof payload.username !== "string" ||
        !["ADMIN", "SALES", "REPORTS"].includes(String(payload.role))) return null;
    return { userId: payload.sub, username: payload.username, role: payload.role as Session["role"] };
  } catch {
    return null;
  }
}
