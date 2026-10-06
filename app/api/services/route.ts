export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ServicePayload } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const rep = searchParams.get("salespersonId") ?? undefined;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const services = await prisma.service.findMany({
    where: {
      serviceDate: { gte: start, lt: end },
      ...(rep ? { salespersonId: rep } : {})
    },
    include: { course: true, instructor: true, location: true, salesperson: true },
    orderBy: { serviceDate: "asc" }
  });

  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const body = (await req.json()) as ServicePayload;
  const created = await prisma.service.create({
    data: {
      ...body,
      amount: body.amount,
      serviceDate: new Date(body.serviceDate)
    }
  });
  return NextResponse.json(created, { status: 201 });
}
