export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const data = await prisma.salesperson.findMany({
    orderBy: { name: "asc" }
  });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { name } = await req.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name requerido" }, { status: 400 });
  }

  const created = await prisma.salesperson.create({
    data: { name: name.trim() }
  });

  return NextResponse.json(created, { status: 201 });
}