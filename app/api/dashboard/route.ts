export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { agendaWhere } from "@/lib/service-scheduling";
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
      where: agendaWhere(start, end),
      include: { salesperson: true, course: true, instructor: true, location: true, dates: { orderBy: { date: "asc" } } }
    });

    const certificateSales = await prisma.certificateSale.findMany({
      where: { saleDate: { gte: start, lt: end } },
      include: { salesperson: true }
    });
    const customerKey = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-PE");
    const totalUniqueCustomers = new Set([
      ...services.map(s => customerKey(s.company)),
      ...certificateSales.map(s => customerKey(s.customerName))
    ].filter(Boolean)).size;
    // Allocate the estimated amount once, in the month of the first date, even when the
    // same service appears on multiple agenda days or continues next month.
    const billingServices = services.filter(s => s.serviceDate >= start && s.serviceDate < end);
    // Certificate-only agenda entries are scheduling copies; certificate revenue
    // is counted from company certificate sales, never from those copies.
    const [invoicedServices, invoicedCertificates] = await Promise.all([
      prisma.service.findMany({ where: { status: "INVOICED", certificatesOnly: false, invoicedAt: { gte: start, lt: end } }, include: { salesperson: true, course: true, instructor: true, location: true, dates: true } }),
      prisma.certificateSale.findMany({ where: { status: "INVOICED", customerType: "COMPANY", invoicedAt: { gte: start, lt: end } }, include: { salesperson: true } })
    ]);
    const invoiced = [...invoicedServices, ...invoicedCertificates];
    const monthlyServices = [...new Map([...services, ...invoicedServices].map(s => [s.id, s])).values()];
    const totalInvoicedBilling = invoiced.reduce((sum, s) => sum.plus(s.amount), new Prisma.Decimal(0)).toNumber();
    const invoicedBySalesperson: Record<string, number> = {};
    for (const s of invoiced) {
      const name = s.salesperson.name;
      invoicedBySalesperson[name] = new Prisma.Decimal(invoicedBySalesperson[name] ?? 0).plus(s.amount).toNumber();
    }
    const totalServices = services.length;
    const totalEstimatedBilling = billingServices.reduce(
      (acc, s) => acc.plus(s.amount),
      new Prisma.Decimal(0)
    ).toNumber();

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
      const activityDate = [s.serviceDate, ...s.dates.map(d => d.date)].filter(d => d >= start && d < end).sort((a, b) => a.getTime() - b.getTime())[0];
      const weekLabel = `Week ${weekOfMonth(activityDate)}`;

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
      monthlyServices,
      totalServices,
      totalEstimatedBilling,
      totalInvoicedBilling,
      invoicedBySalesperson,
      totalUniqueCustomers,
      billingGoal: 200000,
      billingGoalAchieved: totalInvoicedBilling >= 200000,
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