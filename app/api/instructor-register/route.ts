export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agendaWhere, serviceInclude } from "@/lib/service-scheduling";
import { invoiceDate, InvalidRecord } from "@/lib/record-input";
import { classHours } from "@/lib/class-hours";
import { recordError } from "@/lib/record-error";

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const year = Number(q.get('year')), month = Number(q.get('month'));
    if (!Number.isInteger(year) || year < 1900 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) throw new InvalidRecord('Selecciona un mes y año válidos');
    const from = invoiceDate(q.get('from')), to = invoiceDate(q.get('to'));
    if (from && to && to < from) throw new InvalidRecord('La fecha final no puede ser anterior a la inicial');
    const periodStart = new Date(Date.UTC(year, month - 1, 1)), periodEnd = new Date(Date.UTC(year, month, 1));
    const start = from ? new Date(Math.max(periodStart.getTime(), Date.parse(from.toISOString().slice(0, 10)))) : periodStart;
    const end = to ? new Date(Math.min(periodEnd.getTime(), Date.parse(to.toISOString().slice(0, 10)) + 86400000)) : periodEnd;
    const value = (key: string, max = 100) => { const v = q.get(key)?.trim(); if (v && v.length > max) throw new InvalidRecord('Filtro inválido'); return v || undefined; };
    const instructorId = value('instructorId'), courseId = value('courseId'), company = value('company', 200), modality = value('modality');
    if (modality && modality !== 'VIRTUAL' && modality !== 'IN_PERSON') throw new InvalidRecord('Modalidad inválida');
    const services = await prisma.service.findMany({
      where: { AND: [agendaWhere(start, end), ...(courseId ? [{ OR: [{ courseId }, { courses: { some: { id: courseId } } }] }] : [])], certificatesOnly: false,
        ...(instructorId ? { instructorId } : {}), ...(company ? { company: { contains: company, mode: 'insensitive' } } : {}), ...(modality ? { modality: modality as 'VIRTUAL' | 'IN_PERSON' } : {}) },
      include: serviceInclude, orderBy: [{ serviceDate: 'asc' }, { id: 'asc' }]
    });
    const rows = services.flatMap(s => (s.dates.length ? s.dates : [{ date: s.serviceDate, startTime: null, endTime: null }]).filter(d => d.date >= start && d.date < end).map(d => ({
      id: `${s.id}:${d.date.toISOString().slice(0, 10)}`, date: d.date.toISOString().slice(0, 10),
      instructor: s.instructor?.name || 'Sin asignar', company: s.company,
      courses: (s.courses.length ? s.courses : [s.course]).map(c => c.name),
      modality: s.modality === 'VIRTUAL' ? 'Virtual' : s.modality === 'IN_PERSON' ? 'Presencial' : 'Sin registrar',
      location: s.location ? `${s.location.department} / ${s.location.district}` : s.modality === 'VIRTUAL' ? 'Virtual' : 'Sin registrar',
      instructionalMinutes: d.startTime && d.endTime ? classHours(d.startTime, d.endTime)?.instructionalMinutes ?? null : null
    }))).sort((a, b) => a.date.localeCompare(b.date) || a.instructor.localeCompare(b.instructor, 'es') || a.company.localeCompare(b.company, 'es') || a.id.localeCompare(b.id));
    return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return recordError(error); }
}
