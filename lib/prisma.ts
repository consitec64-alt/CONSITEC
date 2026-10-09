import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Each Vercel instance has its own pool. Prisma's CPU-based default can
// exhaust PostgreSQL's role limit across middleware and API instances.
const runtimeUrl = process.env.DATABASE_URL;
function runtimeDatasource() {
  if (!runtimeUrl || !process.env.VERCEL) return undefined;
  const url = new URL(runtimeUrl);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) return undefined;
  url.searchParams.set("connection_limit", "1");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
  return { db: { url: url.toString() } };
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: runtimeDatasource(),
    log: ["error"]
  });

// Reuse the client in production too when the runtime reuses this process.
// CLI migrations retain DIRECT_URL and are unaffected by this runtime limit.
globalForPrisma.prisma = prisma;
