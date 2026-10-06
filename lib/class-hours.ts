export function classHours(startTime: string, endTime: string) {
  const valid = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!valid.test(startTime) || !valid.test(endTime)) return null;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const elapsedMinutes = minutes(endTime) - minutes(startTime);
  if (elapsedMinutes <= 0) return null;
  const breakMinutes = elapsedMinutes > 300 ? 60 : 0;
  return { elapsedMinutes, breakMinutes, instructionalMinutes: elapsedMinutes - breakMinutes };
}
export function durationLabel(minutes: number) {
  return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}
