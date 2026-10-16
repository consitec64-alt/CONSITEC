import { assignedInstructorSessions } from '@/lib/date-assignments';
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classHours } from "@/lib/class-hours";
import { bookedSessions, conflictingDays } from "@/lib/instructor-availability";
import { InvalidRecord, serviceDates } from "@/lib/record-input";
import { datesWhere } from "@/lib/service-scheduling";
import { recordError } from "@/lib/record-error";
export async function GET(req: Request) {
  try {
    const query = new URL(req.url).searchParams;
    const dates = serviceDates(query.getAll("date"));
    const starts = query.getAll("startTime"), ends = query.getAll("endTime");
    const rawDates = query.getAll("date");
    if ((starts.length || ends.length) && (starts.length !== rawDates.length || ends.length !== rawDates.length)) throw new InvalidRecord("Completa los horarios de cada fecha");
    const sessions = rawDates.map((value, index) => {
      const startTime = starts[index] || null, endTime = ends[index] || null;
      if ((startTime || endTime) && !classHours(startTime ?? '', endTime ?? '')) throw new InvalidRecord("Horario inválido");
      return {date: serviceDates([value])[0], startTime, endTime};
    });
    const excluded = query.get("excludeServiceId");
    const booked = await prisma.service.findMany({
      where: { ...datesWhere(dates), ...(excluded ? { id: { not: excluded } } : {}) },
      select: { instructorId: true, instructors:{select:{id:true}}, serviceDate: true, dates: { select: { date: true, startTime: true, endTime: true, instructorIds: true } } }
    });
    const conflicts: Record<string, string[]> = {};
    for (const s of booked) {
      for (const id of new Set([s.instructorId,...s.instructors.map(i=>i.id)].filter((id):id is string=>!!id))) {
        const days = conflictingDays(sessions, assignedInstructorSessions(bookedSessions(s), id));
        if (days.length) conflicts[id] = [...new Set([...(conflicts[id] ?? []), ...days])].sort();
      }
    }
    return NextResponse.json({ conflicts });
  } catch (error) { return recordError(error); }
}
