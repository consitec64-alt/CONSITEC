import { assertMonthsOpen } from '@/lib/monthly-close';
export const dynamic = "force-dynamic";

import { audit } from "@/lib/audit";
import { saleDuplicates, PossibleDuplicate } from "@/lib/duplicates";
import { currentUser } from "@/lib/current-user";
import { assignedSalesperson } from "@/lib/assigned-salesperson";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceDateFor } from "@/lib/invoice-date";
import { saleInput, InvalidRecord } from "@/lib/record-input";
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
        course: true, courses: { orderBy: { name: "asc" } },
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
    const { requestedInvoiceDate, courseIds, ...data } = saleInput(body);
    const created = await prisma.$transaction(async tx => {
      const invoicedAt = invoiceDateFor(data.status, requestedInvoiceDate);
      await assertMonthsOpen(tx, {...data,invoicedAt});
      const duplicates = await saleDuplicates(tx, data.customerName, courseIds, data.saleDate);
      if (duplicates.length && body.allowDuplicate !== true) throw new PossibleDuplicate(duplicates);
      const salespersonId = await assignedSalesperson(tx, actor?.id);
      if (await tx.course.count({where:{id:{in:courseIds}}}) !== courseIds.length) throw new InvalidRecord('Uno de los cursos seleccionados ya no existe');
      const sale = await tx.certificateSale.create({ data: { ...data, salespersonId, invoicedAt, courses:{connect:courseIds.map(id=>({id}))} }, include:{course:true,courses:true,salesperson:true} });
      if (data.amount.greaterThan(700)) {
        const copy = await tx.service.create({ data: {
          company:data.customerName, amount:data.amount, serviceDate:data.saleDate, status:'SCHEDULED', certificatesOnly:true,
          correlativeCode:data.correlativeCode, courseId:data.courseId, salespersonId,
          courses:{connect:courseIds.map(id=>({id}))}, dates:{create:{date:data.saleDate}}
        }, include:{courses:true,dates:true} });
        await audit(tx, actor, "SERVICE", "CREATE", null, copy);
      }
      await audit(tx, actor, "CERTIFICATE", "CREATE", null, sale);
      return sale;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return recordError(error); }
}
