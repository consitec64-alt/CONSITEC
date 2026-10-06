export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
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
  try {
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const newInstructor = await prisma.instructor.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(newInstructor, { status: 201 });
  } catch (error) {
    console.error("Error creando instructor:", error);
    return NextResponse.json(
      { error: "Error creando instructor" },
      { status: 500 }
    );
  }
}