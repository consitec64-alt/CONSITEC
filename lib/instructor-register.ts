import { assignedItems } from './date-assignments';
import { dayModality, modalityLabel } from './class-modality';
import { classHours } from './class-hours';
export type InstructorRegisterRow = {
  id: string; serviceId: string; instructorId: string; confirmed: boolean; date: string; instructor: string; company: string; courses: string[];
  modality: string; location: string; instructionalMinutes: number | null;
};
export const registerMonth = (date: string) => new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T09:00:00Z'));
export const registerDate = (date: string) => date.split('-').reverse().join('/');

type Named = { id: string; name: string };
type RegisterDay = { date: Date; startTime?: string | null; endTime?: string | null; modality?: string | null; courseIds?: string[]; instructorIds?: string[] };
type RegisterService = { id: string; company: string; modality?: string | null; serviceDate: Date | null; dates: RegisterDay[]; course: Named; courses: Named[]; instructor: Named | null; instructors: Named[]; location: { department: string; district: string } | null; registerConfirmations?: {date:string;instructorId:string;confirmed:boolean}[] };
export function instructorRegisterRows(services: RegisterService[], { start, end, modality, courseId, instructorId }: { start: Date; end: Date; modality?: string; courseId?: string; instructorId?: string }): InstructorRegisterRow[] {
  return services.flatMap(service => {
    const days = service.dates.length ? service.dates : service.serviceDate ? [{ date:service.serviceDate }] : [];
    return days.filter(day => day.date >= start && day.date < end && (!modality || modality === 'MIXED' || dayModality(service.modality, day.modality) === modality)).flatMap(day => {
      const courses = assignedItems(service.courses.length ? service.courses : [service.course], day.courseIds);
      if (courseId && !courses.some(course => course.id === courseId)) return [];
      const instructors = assignedItems(service.instructors.length ? service.instructors : service.instructor ? [service.instructor] : [{id:'unassigned',name:'Sin asignar'}], day.instructorIds);
      const date = day.date.toISOString().slice(0,10), dailyModality = dayModality(service.modality, day.modality);
      return instructors.filter(instructor => !instructorId || instructor.id === instructorId).map(instructor => ({
        id:`${service.id}:${date}:${instructor.id}`, serviceId:service.id, instructorId:instructor.id, date,
        confirmed:!!service.registerConfirmations?.some(c => c.date === date && c.instructorId === instructor.id && c.confirmed),
        instructor:instructor.name, company:service.company, courses:courses.map(course=>course.name),
        modality:modalityLabel(dailyModality), location:dailyModality === 'VIRTUAL' ? 'Virtual' : service.location ? `${service.location.department} / ${service.location.district}` : 'Sin registrar',
        instructionalMinutes:day.startTime && day.endTime ? classHours(day.startTime,day.endTime)?.instructionalMinutes ?? null : null,
      }));
    });
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.instructor.localeCompare(b.instructor,'es')||a.company.localeCompare(b.company,'es')||a.id.localeCompare(b.id));
}
