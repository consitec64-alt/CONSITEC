import { assignedItems } from './date-assignments';
export type Meta = {
  id: string; color?: string; name?: string; department?: string; district?: string;
  address?: string | null; dni?: string | null; courses?: { id: string; name: string }[]; courseNotes?: string | null;
  emoExpiresAt?: string | null; sctr?: boolean; sctrStartsAt?: string | null; sctrEndsAt?: string | null; carModel?: string | null; carPlate?: string | null;
};
export type Service = {
  id: string; importedLocation?: string | null; certificateSaleId?:string|null; company: string; correlativeCode: string | null; travelMode: 'NONE' | 'PLANE' | 'BUS';
  amount: string; invoicedAt?: string | null; serviceDate: string | null; dates?: { reportedInstructionalMinutes?: number | null; courseIds?: string[]; instructorIds?: string[]; modality?: 'VIRTUAL' | 'IN_PERSON' | null; date: string; startTime?: string | null; endTime?: string | null }[]; modality?: 'VIRTUAL' | 'IN_PERSON' | 'MIXED' | null; certificatesOnly: boolean;
  status: string; courses?: Meta[]; course: Meta; instructor: Meta | null; instructors?: Meta[]; location: Meta | null; salesperson: Meta | null;
};
export const serviceDays = (service: Service) => [...new Set([service.serviceDate, ...(service.dates ?? []).map(d => d.date)].filter((d): d is string => !!d).map(d => d.slice(0, 10)))].sort();

export const serviceCourses = (service: Service) => service.courses?.length ? service.courses : [service.course];

export const serviceInstructors = (service: Service) => service.instructors?.length ? service.instructors : service.instructor ? [service.instructor] : [];
export type CertificateSale = { invoicedAt?: string | null; id:string;customerName:string;customerType:string;certificateKind?:'OPERATOR'|'INSPECTION';correlativeCode?:string|null;amount:string;saleDate:string;status:string;course:Meta;courses?:Meta[];salesperson:Meta };
export const certificateCourses = (sale:CertificateSale) => sale.courses?.length ? sale.courses : [sale.course];

export const serviceCoursesForDate = (service: Service, date: string) => assignedItems(serviceCourses(service), service.dates?.find(day => day.date.slice(0,10) === date.slice(0,10))?.courseIds);
export const serviceInstructorsForDate = (service: Service, date: string) => assignedItems(serviceInstructors(service), service.dates?.find(day => day.date.slice(0,10) === date.slice(0,10))?.instructorIds);
