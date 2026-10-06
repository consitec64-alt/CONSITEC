import { NextResponse } from "next/server";
import { currentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json(user ?? { error: "Debes iniciar sesión" }, {
    status: user ? 200 : 401, headers: { "Cache-Control": "private, no-store" }
  });
}
