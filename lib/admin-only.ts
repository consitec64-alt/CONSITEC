import { NextResponse } from "next/server";
import { currentUser } from "@/lib/current-user";
export async function adminOnly() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Solo los administradores pueden gestionar comerciales" }, { status: 403 });
  return null;
}
