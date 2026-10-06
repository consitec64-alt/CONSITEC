import { Prisma, CustomerType, ServiceStatus, TravelMode } from "@prisma/client";

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
  return { amount: new Prisma.Decimal(amount), courseId: text(body.courseId, "Curso", 100), salespersonId: text(body.salespersonId, "Comercial", 100), status: body.status as ServiceStatus };
}
export function invoiceDate(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined;
  const parsed = date(value);
  return new Date(parsed.toISOString().slice(0, 10) + "T09:00:00.000Z");
}
export function saleInput(body: Record<string, unknown>) {
  if (!body || typeof body !== "object") throw new InvalidRecord("Solicitud inválida");
  if (!Object.values(CustomerType).includes(body.customerType as CustomerType)) throw new InvalidRecord("Tipo de cliente inválido");
  return { ...common(body), requestedInvoiceDate: invoiceDate(body.invoiceDate), customerName: text(body.customerName, "Cliente"), customerType: body.customerType as CustomerType, saleDate: date(body.saleDate) };
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
  if (typeof body.certificatesOnly !== "boolean") throw new InvalidRecord("Selecciona el tipo de servicio");
  if (typeof body.correlativeCode !== "string" || !/^[0-9]{4}$/.test(body.correlativeCode)) throw new InvalidRecord("El código de correlativo debe tener exactamente 4 dígitos numéricos");
  const travelMode = body.travelMode ?? "NONE";
  if (!Object.values(TravelMode).includes(travelMode as TravelMode)) throw new InvalidRecord("Viáticos inválidos");
  const dates = serviceDates(body.serviceDates ?? [body.serviceDate]);
  return { ...common(body), company: text(body.company, "Cliente"), correlativeCode: body.correlativeCode,
    requestedInvoiceDate: invoiceDate(body.invoiceDate), travelMode: travelMode as TravelMode, serviceDate: dates[0], dates, certificatesOnly: body.certificatesOnly,
    instructorId: body.instructorId == null || body.instructorId === "" ? null : text(body.instructorId, "Instructor", 100),
    locationId: body.locationId == null || body.locationId === "" ? null : text(body.locationId, "Ubicación", 100) };
}
export function instructorInput(body: Record<string, unknown>) {
  if (!body || typeof body !== "object") throw new InvalidRecord("Solicitud inválida");
  const optionalText = (value: unknown, label: string, max: number) => value == null || value === "" ? null : text(value, label, max);
  if (body.sctr !== undefined && typeof body.sctr !== "boolean") throw new InvalidRecord("SCTR debe ser Sí o No");
  return {
    name: text(body.name, "Nombre"), address: optionalText(body.address, "Dirección", 1000),
    dni: optionalText(body.dni, "DNI", 100), courses: optionalText(body.courses, "Cursos", 2000),
    emoExpiresAt: body.emoExpiresAt ? date(body.emoExpiresAt) : null, sctr: (body.sctr as boolean | undefined) ?? false,
    carModel: optionalText(body.carModel, "Modelo de auto", 200), carPlate: optionalText(body.carPlate, "Placa", 100)
  };
}
