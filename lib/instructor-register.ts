export type InstructorRegisterRow = {
  id: string; serviceId: string; instructorId: string; confirmed: boolean; date: string; instructor: string; company: string; courses: string[];
  modality: string; location: string; instructionalMinutes: number | null;
};
export const registerMonth = (date: string) => new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T09:00:00Z'));
export const registerDate = (date: string) => date.split('-').reverse().join('/');
