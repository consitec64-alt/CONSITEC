export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serviceDates } from "@/lib/record-input";
import { datesWhere } from "@/lib/service-scheduling";
import { recordError } from "@/lib/record-error";
export async function GET(req: Request) {
  try {
    const query = new URL(req.url).searchParams;
    const dates = serviceDates(query.getAll("date"));
    const excluded = query.get("excludeServiceId");
    const booked = await prisma.service.findMany({
      where: { ...datesWhere(dates), ...(excluded ? { id: { not: excluded } } : {}) },
      select: { instructorId: true, instructors:{select:{id:true}}, serviceDate: true, dates: { select: { date: true } } }
    });
    const selected = new Set(dates.map(d => d.toISOString().slice(0, 10)));
    const conflicts: Record<string, string[]> = {};
    for (const s of booked) {
      const days = [s.serviceDate, ...s.dates.map(d => d.date)].map(d => d.toISOString().slice(0, 10)).filter(d => selected.has(d));
      for (const id of new Set([s.instructorId,...s.instructors.map(i=>i.id)].filter((id):id is string=>!!id))) conflicts[id] = [...new Set([...(conflicts[id] ?? []), ...days])].sort();
    }
    return NextResponse.json({ conflicts });
  } catch (error) { return recordError(error); }
}
