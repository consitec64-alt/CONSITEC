export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function weekOfMonth(date: Date) {
  return Math.min(4, Math.ceil(date.getDate() / 7));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const services = await prisma.service.findMany({
      where: { serviceDate: { gte: start, lt: end } },
      include: { salesperson: true, course: true, instructor: true }
    });

    const totalServices = services.length;
    const totalEstimatedBilling = services.reduce(
      (acc, s) => acc + Number(s.amount),
      0
    );

    const bySalesperson: Record<string, number> = {};
    const byWeek: Record<string, number> = {
      "Week 1": 0,
      "Week 2": 0,
      "Week 3": 0,
      "Week 4": 0
    };
    const weeklyMatrix: Record<string, Record<string, number>> = {};
    const byCourse: Record<string, number> = {};
    const byInstructor: Record<string, number> = {};

    for (const s of services) {
      const rep = s.salesperson?.name ?? "Sin comercial";
      const weekLabel = `Week ${weekOfMonth(s.serviceDate)}`;

      bySalesperson[rep] = (bySalesperson[rep] ?? 0) + 1;
      byWeek[weekLabel] = (byWeek[weekLabel] ?? 0) + 1;

      if (s.course?.name) {
        byCourse[s.course.name] =
          (byCourse[s.course.name] ?? 0) + 1;
      }

      if (s.instructor?.name) {
        byInstructor[s.instructor.name] =
          (byInstructor[s.instructor.name] ?? 0) + 1;
      }

      if (!weeklyMatrix[rep]) {
        weeklyMatrix[rep] = {
          "Week 1": 0,
          "Week 2": 0,
          "Week 3": 0,
          "Week 4": 0
        };
      }

      weeklyMatrix[rep][weekLabel] += 1;
    }

    const ranking = Object.entries(bySalesperson).sort(
      (a, b) => b[1] - a[1]
    );

    const topSalesRep = ranking[0]?.[0] ?? "-";
    const bestSellingCourse =
      Object.entries(byCourse).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
    const mostAssignedInstructor =
      Object.entries(byInstructor).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    return NextResponse.json({
      totalServices,
      totalEstimatedBilling,
      topSalesRep,
      bestSellingCourse,
      mostAssignedInstructor,
      bonus45: totalServices > 45,
      bonus70: totalServices > 70,
      bySalesperson,
      byWeek,
      weeklyMatrix,
      ranking
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Error generando dashboard" },
      { status: 500 }
    );
  }
}