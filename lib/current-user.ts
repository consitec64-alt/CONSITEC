import { cookies } from "next/headers";
import { getSession, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function currentUser() {
  const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName:true, avatar:true, textSize:true, mustChangePassword:true, sessionVersion:true, tutorialStep: true, tutorialCompleted: true, id: true, username: true, role: true, salespersonId: true, salesperson: { select: { id: true, name: true } } }
  });
  return user && user.sessionVersion === (session.sessionVersion ?? 0) ? user : null;
}
