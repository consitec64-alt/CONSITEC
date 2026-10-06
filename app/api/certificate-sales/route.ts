export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ✅ GET (para dashboard)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const sales = await prisma.certificateSale.findMany({
      where: {
        saleDate: { gte: start, lt: end },
      },
      include: {
        course: true,
        salesperson: true,
      },
      orderBy: { saleDate: "desc" },
    });

    return NextResponse.json(sales);
  } catch (err) {
    console.error("Error en GET /certificate-sales:", err);
    return NextResponse.json(
      { error: "Error obteniendo ventas" },
      { status: 500 }
    );
  }
}

// ✅ POST (para crear venta)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      courseId,
      salespersonId,
      saleDate,
      amount,
      customerName,
      customerType,
      status
    } = body;

    const createdSale = await prisma.certificateSale.create({
      data: {
        courseId,
        salespersonId,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        amount: new Prisma.Decimal(amount),
        customerName,
        customerType,
        status
      },
    });

    return NextResponse.json(createdSale, { status: 201 });
  } catch (err) {
    console.error("Error en POST /certificate-sales:", err);
    return NextResponse.json(
      { error: "Error creando venta" },
      { status: 500 }
    );
  }
}