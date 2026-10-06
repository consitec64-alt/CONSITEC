export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { instructorInput } from "@/lib/record-input";
import { recordError } from "@/lib/record-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const instructors = await prisma.instructor.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(instructors);
  } catch (error) {
    console.error("Error obteniendo instructores:", error);
    return NextResponse.json(
      { error: "Error obteniendo instructores" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try { return NextResponse.json(await prisma.instructor.create({ data: instructorInput(await req.json()) }), { status: 201 }); }
  catch (error) { return recordError(error); }
}
