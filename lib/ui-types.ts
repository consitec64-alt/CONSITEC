export type Meta = {
  id: string; color?: string; name?: string; department?: string; district?: string;
  address?: string | null; dni?: string | null; courses?: string | null;
  emoExpiresAt?: string | null; sctr?: boolean; carModel?: string | null; carPlate?: string | null;
};
export type Service = {
  id: string; company: string; correlativeCode: string | null; travelMode: 'NONE' | 'PLANE' | 'BUS';
  amount: string; invoicedAt?: string | null; serviceDate: string; dates?: { date: string }[]; certificatesOnly: boolean;
  status: string; course: Meta; instructor: Meta | null; location: Meta | null; salesperson: Meta;
};
export const serviceDays = (service: Service) => [...new Set([service.serviceDate, ...(service.dates ?? []).map(d => d.date)].map(d => d.slice(0, 10)))].sort();
