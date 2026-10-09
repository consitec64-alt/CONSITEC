import { Prisma, CustomerType, ServiceStatus, TravelMode, ClassModality, CertificateKind } from "@prisma/client";

import { isDayModality } from "@/lib/class-modality";
import { classHours } from "@/lib/class-hours";

export class InvalidRecord extends Error {}
const text = (value: unknown, label: string, max = 200) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new InvalidRecord(`${label} inválido`);
  return value.trim();
};
function date(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(value)) throw new InvalidRecord("Fecha inválida");
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value.slice(0, 10)) throw new InvalidRecord("Fecha inválida");
  return parsed;
}
function common(body: Record<string, unknown>) {
  const amount = body.amount;
  if ((typeof amount !== "number" && typeof amount !== "string") || !/^\d+(?:\.\d{1,2})?$/.test(String(amount)) ||
      !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > 99999999.99) throw new InvalidRecord("Ingresa un importe válido mayor a cero, con hasta dos decimales");
  if (!Object.values(ServiceStatus).includes(body.status as ServiceStatus)) throw new InvalidRecord("Estado inválido");
  return { amount: new Prisma.Decimal(amount), courseId: text(body.courseId, "Curso", 100), status: body.status as ServiceStatus };
}
export function invoiceDate(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined;
  const parsed = date(value);
  return new Date(parsed.toISOString().slice(0, 10) + "T09:00:00.000Z");
}
function selectedIds(value: unknown, label: string, allowEmpty = false): string[] {
  if (!Array.isArray(value) || (!allowEmpty && !value.length) || value.length > 100) throw new InvalidRecord(`Selecciona ${allowEmpty ? 'hasta' : 'entre 1 y'} 100 ${label.toLowerCase()} del catálogo`);
  return [...new Set(value.map(id => text(id, label, 100)))];
}
export function saleInput(body: Record<string, unknown>) {
  if (!body || typeof body !== "object") throw new InvalidRecord("Solicitud inválida");
  if (!Object.values(CustomerType).includes(body.customerType as CustomerType)) throw new InvalidRecord("Tipo de cliente inválido");
  const certificateKind = body.certificateKind ?? 'OPERATOR';
  if (!Object.values(CertificateKind).includes(certificateKind as CertificateKind)) throw new InvalidRecord('Selecciona Operador o Inspección');
  if (certificateKind === 'INSPECTION' && body.customerType !== 'COMPANY') throw new InvalidRecord('Los certificados de inspección corresponden siempre a una empresa');
  const correlativeCode = body.customerType === 'COMPANY' ? body.correlativeCode : null;
  if (body.customerType === 'COMPANY' && (typeof correlativeCode !== 'string' || !/^[0-9]{4}$/.test(correlativeCode))) throw new InvalidRecord('El correlativo de empresa debe tener exactamente 4 dígitos numéricos');
  const allowed = body.customerType === "COMPANY" ? ["SCHEDULED","INVOICED"] : ["SCHEDULED","PAID"];
  if (!allowed.includes(String(body.status))) throw new InvalidRecord("Estado no válido para este tipo de cliente");
  const courseIds = selectedIds(body.courseIds === undefined ? [body.courseId] : body.courseIds, 'Cursos');
  return { ...common({...body, courseId:courseIds[0]}), courseIds, certificateKind: certificateKind as CertificateKind, correlativeCode: correlativeCode as string | null,
    requestedInvoiceDate: invoiceDate(body.invoiceDate), customerName: text(body.customerName, "Cliente"), customerType: body.customerType as CustomerType, saleDate: date(body.saleDate) };
}
export function serviceDates(values: unknown): Date[] {
  if (!Array.isArray(values) || !values.length || values.length > 366) throw new InvalidRecord("Agrega entre 1 y 366 fechas al servicio");
  const days = values.map(value => {
    const parsed = date(value);
    return new Date(parsed.toISOString().slice(0, 10) + "T09:00:00.000Z");
  });
  return [...new Map(days.map(day => [day.toISOString(), day])).values()].sort((a, b) => a.getTime() - b.getTime());
}
export function serviceInput(body: Record<string, unknown>) {
  if (!body || typeof body !== "object") throw new InvalidRecord("Solicitud inválida");
  if (body.status === "PAID") throw new InvalidRecord("Pagado solo se usa para certificados de personas naturales");
  if (typeof body.certificatesOnly !== "boolean") throw new InvalidRecord("Selecciona el tipo de servicio");
  if (typeof body.correlativeCode !== "string" || !/^[0-9]{4}$/.test(body.correlativeCode)) throw new InvalidRecord("El código de correlativo debe tener exactamente 4 dígitos numéricos");
  const travelMode = body.travelMode ?? "NONE";
  if (!Object.values(TravelMode).includes(travelMode as TravelMode)) throw new InvalidRecord("Viáticos inválidos");
  const courseIds = selectedIds(body.courseIds === undefined ? [body.courseId] : body.courseIds, 'Cursos');
  const instructorIds = selectedIds(body.instructorIds === undefined ? (body.instructorId ? [body.instructorId] : []) : body.instructorIds, 'Instructores', true);
  const modality = body.modality || null;
  if (modality !== null && !Object.values(ClassModality).includes(modality as ClassModality)) throw new InvalidRecord("Modalidad inválida");
  const rawSessions = body.sessions;
  if (rawSessions !== undefined && (!Array.isArray(rawSessions) || !rawSessions.length || rawSessions.length > 366)) throw new InvalidRecord("Agrega entre 1 y 366 fechas al servicio");
  const dates = serviceDates(rawSessions ? (rawSessions as Record<string, unknown>[]).map(session => session?.date) : body.serviceDates ?? [body.serviceDate]);
  const sessions = dates.map(day => {
    const matching = Array.isArray(rawSessions) ? rawSessions.filter(session => typeof session?.date === "string" && session.date.slice(0, 10) === day.toISOString().slice(0, 10)) : [];
    if (matching.length > 1) throw new InvalidRecord("Cada fecha debe aparecer una sola vez");
    const session = matching[0];
    const startTime = session?.startTime || null, endTime = session?.endTime || null;
    if ((startTime || endTime) && (typeof startTime !== "string" || typeof endTime !== "string" || !classHours(startTime, endTime))) throw new InvalidRecord("Usa horas de inicio y fin válidas (24 horas); el fin debe ser posterior al inicio");
    if (modality === 'MIXED' && !isDayModality(session?.modality)) throw new InvalidRecord(`Selecciona Virtual o Presencial para la fecha ${day.toISOString().slice(0, 10)}`);
    return { date: day, startTime: startTime as string | null, endTime: endTime as string | null,
      modality: (modality === 'MIXED' ? session!.modality : modality) as ClassModality | null };
  });
  return { ...common({ ...body, courseId: courseIds[0] }), courseIds, company: text(body.company, "Cliente"), correlativeCode: body.correlativeCode,
    requestedInvoiceDate: invoiceDate(body.invoiceDate), travelMode: travelMode as TravelMode, serviceDate: dates[0], dates, sessions, modality: modality as ClassModality | null, certificatesOnly: body.certificatesOnly,
    instructorIds, instructorId: instructorIds[0] ?? null,
    locationId: body.locationId == null || body.locationId === "" ? null : text(body.locationId, "Ubicación", 100) };
}
export function instructorInput(body: Record<string, unknown>) {
  if (!body || typeof body !== "object") throw new InvalidRecord("Solicitud inválida");
  const optionalText = (value: unknown, label: string, max: number) => value == null || value === "" ? null : text(value, label, max);
  if (body.sctr !== undefined && typeof body.sctr !== "boolean") throw new InvalidRecord("SCTR debe ser Sí o No");
  if (body.courseIds !== undefined && (!Array.isArray(body.courseIds) || body.courseIds.length > 500 || body.courseIds.some(id => typeof id !== "string" || !id || id.length > 100))) throw new InvalidRecord("Selecciona cursos del catálogo");
  return {
    ...(Array.isArray(body.courseIds) ? { courses: { set: [...new Set(body.courseIds as string[])].map(id => ({ id })) } } : {}),
    name: text(body.name, "Nombre"), address: optionalText(body.address, "Dirección", 1000),
    dni: optionalText(body.dni, "DNI", 100),
    emoExpiresAt: body.emoExpiresAt ? date(body.emoExpiresAt) : null, sctr: (body.sctr as boolean | undefined) ?? false,
    carModel: optionalText(body.carModel, "Modelo de auto", 200), carPlate: optionalText(body.carPlate, "Placa", 100)
  };
}
