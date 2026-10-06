import { Prisma, CustomerType, ServiceStatus } from "@prisma/client";

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
export function saleInput(body: Record<string, unknown>) {
  if (!body || typeof body !== "object") throw new InvalidRecord("Solicitud inválida");
  if (!Object.values(CustomerType).includes(body.customerType as CustomerType)) throw new InvalidRecord("Tipo de cliente inválido");
  return { ...common(body), customerName: text(body.customerName, "Cliente"), customerType: body.customerType as CustomerType, saleDate: date(body.saleDate) };
}
export function serviceInput(body: Record<string, unknown>) {
  if (!body || typeof body !== "object") throw new InvalidRecord("Solicitud inválida");
  if (typeof body.certificatesOnly !== "boolean") throw new InvalidRecord("Selecciona el tipo de servicio");
  return { ...common(body), company: text(body.company, "Cliente"), serviceDate: date(body.serviceDate), certificatesOnly: body.certificatesOnly,
    instructorId: body.instructorId == null || body.instructorId === "" ? null : text(body.instructorId, "Instructor", 100),
    locationId: body.locationId == null || body.locationId === "" ? null : text(body.locationId, "Ubicación", 100) };
}
