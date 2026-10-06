export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { instructorInput } from "@/lib/record-input";
import { recordError } from "@/lib/record-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const instructors = await prisma.instructor.findMany({
      orderBy: { name: "asc" }, include: { courses: true },
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
  try { const { courses, ...data } = instructorInput(await req.json()); return NextResponse.json(await prisma.instructor.create({ data: { ...data, ...(courses ? { courses: { connect: courses.set } } : {}) }, include: { courses: true } }), { status: 201 }); }
  catch (error) { return recordError(error); }
}
