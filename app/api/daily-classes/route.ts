import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { peruDay, dailyClassRange } from '@/lib/daily-classes';
import { dayModality } from '@/lib/class-modality';
export const dynamic = 'force-dynamic';
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  if (!user.salespersonId || user.mustChangePassword) return NextResponse.json({ reminder: null });
  const day = peruDay(), { start, end } = dailyClassRange(day);
  try {
    const reminder = await prisma.$transaction(async tx => {
      // Atomic claim prevents duplicate reminders across tabs and devices.
      const claim = await tx.user.updateMany({ where: { id: user.id, salespersonId: user.salespersonId, OR: [{ dailyClassesSeenOn: null }, { dailyClassesSeenOn: { not: day } }] }, data: { dailyClassesSeenOn: day } });
      if (!claim.count) return null;
      const services = await tx.service.findMany({
        where: { deletedAt: null, certificatesOnly: false, OR: [{ dates: { some: { date: { gte: start, lt: end } } } }, { dates: { none: {} }, serviceDate: { gte: start, lt: end } }] },
        select: { id: true, company: true, modality: true, course: { select: { name: true } }, courses: { select: { name: true } }, instructor: { select: { name: true } }, instructors: { select: { name: true } }, salesperson: { select: { name: true } }, location: { select: { department: true, district: true } }, dates: { where: { date: { gte: start, lt: end } }, select: { startTime: true, endTime: true, modality: true } } },
        orderBy: { company: 'asc' }
      });
      const classes = services.map(s => ({ id: s.id, company: s.company, courses: (s.courses.length ? s.courses : [s.course]).map(c => c.name), instructors: (s.instructors.length ? s.instructors : s.instructor ? [s.instructor] : []).map(i => i.name), commercial: s.salesperson?.name ?? "Sin asignar", startTime: s.dates[0]?.startTime ?? null, endTime: s.dates[0]?.endTime ?? null, modality: dayModality(s.modality, s.dates[0]?.modality), location: s.location ? `${s.location.department} / ${s.location.district}` : null }));
      classes.sort((a,b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99') || a.company.localeCompare(b.company));
      return classes.length ? { day, classes } : null;
    });
    return NextResponse.json({ reminder }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudo consultar las clases de hoy' }, { status: 503 }); }
}
