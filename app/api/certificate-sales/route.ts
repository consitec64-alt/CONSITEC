export const dynamic = "force-dynamic";

import { audit } from "@/lib/audit";
import { saleDuplicates, PossibleDuplicate } from "@/lib/duplicates";
import { currentUser } from "@/lib/current-user";
import { assignedSalesperson } from "@/lib/assigned-salesperson";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceDateFor } from "@/lib/invoice-date";
import { saleInput, serviceInput } from "@/lib/record-input";
import { recordError } from "@/lib/record-error";

// ✅ GET (para dashboard)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const sales = await prisma.certificateSale.findMany({
      where: { deletedAt: null,
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

export async function POST(req: Request) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
    const body = await req.json();
    const { requestedInvoiceDate, ...data } = saleInput(body);
    // Create the agenda copy atomically, so retries cannot leave a half-saved sale.
    const scheduled = data.amount.greaterThan(700) ? serviceInput({
      ...data, amount: data.amount.toString(), company: data.customerName, certificatesOnly: true, instructorId: null,
      locationId: null, serviceDate: data.saleDate.toISOString(), status: "SCHEDULED",
      correlativeCode: body.correlativeCode
    }) : null;
    const created = await prisma.$transaction(async tx => {
      const duplicates = await saleDuplicates(tx, data.customerName, data.courseId, data.saleDate);
      if (duplicates.length && body.allowDuplicate !== true) throw new PossibleDuplicate(duplicates);
      const salespersonId = await assignedSalesperson(tx, actor?.id);
      const sale = await tx.certificateSale.create({ data: { ...data, salespersonId, invoicedAt: invoiceDateFor(data.status, requestedInvoiceDate) } });
      if (scheduled) {
        const { dates: _dates, sessions, courseIds, requestedInvoiceDate: _invoice, ...service } = scheduled;
        const copy = await tx.service.create({ data: { ...service, salespersonId, courses: { connect: courseIds.map(id => ({ id })) }, dates: { create: sessions } }, include: { courses: true, dates: true } });
        await audit(tx, actor, "SERVICE", "CREATE", null, copy);
      }
      await audit(tx, actor, "CERTIFICATE", "CREATE", null, sale);
      return sale;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return recordError(error); }
}
