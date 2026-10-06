export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error obteniendo cursos:", error);
    return NextResponse.json(
      { error: "Error obteniendo cursos" },
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

    const newCourse = await prisma.course.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(newCourse, { status: 201 });
  } catch (error) {
    console.error("Error creando curso:", error);
    return NextResponse.json(
      { error: "Error creando curso" },
      { status: 500 }
    );
  }
}