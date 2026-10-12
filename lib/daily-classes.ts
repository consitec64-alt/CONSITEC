// Class dates are calendar labels stored at 09:00Z, not instants to shift to Lima.
export function peruDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function dailyClassRange(day: string) {
  const start = new Date(`${day}T00:00:00.000Z`);
  return { start, end: new Date(start.getTime() + 86400000) };
}
