export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { department: "asc" },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error obteniendo sedes:", error);
    return NextResponse.json(
      { error: "Error obteniendo sedes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { department, district } = await req.json();

    if (!department || !department.trim()) {
      return NextResponse.json(
        { error: "El departamento es obligatorio" },
        { status: 400 }
      );
    }

    if (!district || !district.trim()) {
      return NextResponse.json(
        { error: "El distrito es obligatorio" },
        { status: 400 }
      );
    }

    const newLocation = await prisma.location.create({
      data: {
        department: department.trim(),
        district: district.trim(),
      },
    });

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error("Error creando sede:", error);
    return NextResponse.json(
      { error: "Error creando sede" },
      { status: 500 }
    );
  }
}