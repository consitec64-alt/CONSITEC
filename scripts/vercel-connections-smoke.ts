import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma';

async function main() {
assert.equal(new URL(process.env.DATABASE_URL!).hostname, 'localhost', 'Use a local test database only');
assert.equal(process.env.VERCEL, '1', 'Enable the Vercel runtime configuration');
try {
  const results = await Promise.all(Array.from({length: 20}, () => prisma.$queryRaw<Array<{pid:number}>>`SELECT pg_backend_pid() AS pid, pg_sleep(0.02)::text`));
  assert.equal(new Set(results.map(rows => rows[0].pid)).size, 1, 'Concurrent requests must share one PostgreSQL connection');
  assert.equal((globalThis as unknown as {prisma: unknown}).prisma, prisma, 'Reuse the client in production');
  console.log('PASS: 20 concurrent local queries share one connection with the Vercel runtime configuration; singleton retained in production.');
} finally {
  await prisma.$disconnect();
}

}
void main().catch(error => { console.error(error); process.exitCode = 1; });
