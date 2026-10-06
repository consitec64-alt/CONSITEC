export function invoiceDateFor(status: string, requested?: Date, existing?: { status: string; invoicedAt: Date | null }) {
  if (status !== "INVOICED") return null;
  if (requested) return requested;
  if (existing?.status === "INVOICED" && existing.invoicedAt) return existing.invoicedAt;
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return new Date(`${get("year")}-${get("month")}-${get("day")}T09:00:00.000Z`);
}
