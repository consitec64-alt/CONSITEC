export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agendaWhere, serviceInclude, writeService } from "@/lib/service-scheduling";
import { currentUser } from "@/lib/current-user";
import { recordError } from "@/lib/record-error";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("month")), year = Number(searchParams.get("year"));
  const rep = searchParams.get("salespersonId") ?? undefined;
  const services = await prisma.service.findMany({
    where: { ...agendaWhere(new Date(year, month - 1, 1), new Date(year, month, 1)), ...(rep ? { salespersonId: rep } : {}) },
    include: serviceInclude, orderBy: { serviceDate: "asc" }
  });
  return NextResponse.json(services);
}
export async function POST(req: Request) {
  try { return NextResponse.json(await writeService(await req.json(), undefined, (await currentUser())?.id), { status: 201 }); }
  catch (error) { return recordError(error); }
}
