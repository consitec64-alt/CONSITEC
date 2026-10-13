import { prisma } from "@/lib/prisma";
import { limaToday } from "@/lib/monthly-close";

export function scheduledServiceStatus(status: string, dates: Date[], now = new Date()) {
  return status === "SCHEDULED" && dates.length && dates.every(date => date.toISOString().slice(0, 10) < limaToday(now)) ? "EXECUTED" : status;
}

// Date-only classes finish after their final day in Peru. Undated services remain scheduled.
export async function executePastServices(now = new Date()) {
  const today = new Date(limaToday(now) + "T00:00:00.000Z");
  return prisma.service.updateMany({
    where: {
      deletedAt: null, certificatesOnly: false, status: "SCHEDULED",
      OR: [
        { dates: { some: {}, none: { date: { gte: today } } } },
        { dates: { none: {} }, serviceDate: { lt: today } }
      ]
    },
    data: { status: "EXECUTED" }
  });
}
