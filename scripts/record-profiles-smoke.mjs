import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';

const env = parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'));
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3073';
assert.equal(new URL(env.DATABASE_URL).hostname, 'localhost');
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local test database and application only');
const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const prefix = `author-${Date.now()}`, password = crypto.randomUUID(), ids = [], services = [], sales = [], quotes = [];
let checks = 0, reps = [], course;
async function api(path, cookie, method = 'GET', body, status = 200) {
  const r = await fetch(base + path, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await r.json();
  assert.equal(r.status, status, `${path}: ${data.error || ''}`); checks++;
  return { data, cookie: r.headers.get('set-cookie')?.split(';')[0] };
}
async function profile(entity, id, cookie, status = 200) {
  const { data } = await api(`/api/record-profile?entity=${entity}&id=${id}`, cookie, 'GET', undefined, status);
  if (status === 200) {
    assert.deepEqual(Object.keys(data).sort(), ['avatar', 'commercial', 'name', 'registeredAt', 'role', 'state']);
    assert(!JSON.stringify(data).includes(password));
  }
  return data;
}
try {
  reps = await Promise.all(['A', 'B'].map(s => db.salesperson.create({ data: { name: prefix + s } })));
  course = await db.course.create({ data: { name: prefix } });
  const hash = await bcrypt.hash(password, 10);
  const users = await Promise.all(['ADMIN', 'SALES', 'SALES', 'SUPERVISOR'].map((role, i) => db.user.create({ data: { username: `${prefix}-${i}@example.com`, password: hash, role, salespersonId: role === 'SALES' ? reps[i - 1].id : null, tutorialCompleted: true } })));
  ids.push(...users.map(u => u.id));
  const [admin, seller, other, supervisor] = await Promise.all(users.map(async u => (await api('/api/auth/login', null, 'POST', { username: u.username, password })).cookie));
  const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j/1sAAAAASUVORK5CYII=';
  await api('/api/profile', seller, 'PATCH', { avatar });
  const serviceBody = { company: prefix, correlativeCode: '0941', amount: 900, courseIds: [course.id], serviceDate: '2099-10-01', dates: ['2099-10-01'], sessions: [{ date: '2099-10-01', startTime: '09:00', endTime: '15:00' }], modality: 'VIRTUAL', status: 'SCHEDULED', certificatesOnly: false, travelMode: 'NONE', instructorIds: [] };
  const service = (await api('/api/services', seller, 'POST', serviceBody, 201)).data; services.push(service.id);
  for (const cookie of [admin, seller, other, supervisor]) {
    const p = await profile('SERVICE', service.id, cookie);
    assert.equal(p.name, reps[0].name); assert.equal(p.role, 'Vendedor'); assert.equal(p.avatar, avatar); assert.equal(p.commercial, reps[0].name); assert(p.registeredAt);
  }
  await api('/api/services/' + service.id, admin, 'PATCH', { ...serviceBody, amount: 1000 });
  assert.equal((await profile('SERVICE', service.id, supervisor)).name, reps[0].name, 'An edit must not change creator');
  const certificateBody = { customerName: prefix, customerType: 'COMPANY', certificateKind: 'OPERATOR', correlativeCode: '0942', amount: 600, courseIds: [course.id], status: 'SCHEDULED', saleDate: '2099-10-03' };
  const sale = (await api('/api/certificate-sales', seller, 'POST', certificateBody, 201)).data; sales.push(sale.id);
  await api('/api/certificate-sales/' + sale.id, admin, 'PATCH', { ...certificateBody, amount: 900 });
  const copy = await db.service.findUniqueOrThrow({ where: { certificateSaleId: sale.id } }); services.push(copy.id);
  assert.equal((await profile('SERVICE', copy.id, supervisor)).name, reps[0].name, 'Agenda copy must resolve original seller, not administrator who raised amount');
  assert.equal((await profile('CERTIFICATE', sale.id, other)).avatar, avatar);
  const quote = (await api('/api/quotations', seller, 'POST', { company: prefix, amount: 500, courseIds: [course.id], status: 'DRAFT' }, 201)).data; quotes.push(quote.id);
  assert.equal((await profile('QUOTATION', quote.id, admin)).name, reps[0].name);
  assert.equal((await profile('QUOTATION', quote.id, seller)).name, reps[0].name);
  await profile('QUOTATION', quote.id, supervisor, 403);
  await profile('QUOTATION', quote.id, other, 404);
  const update = await db.auditLog.findFirstOrThrow({ where: { entity: 'SERVICE', recordId: service.id, action: 'UPDATE' } });
  const actionProfile = await profile('HISTORY', update.id, admin);
  assert.equal(actionProfile.name, 'Administrador'); assert.equal(actionProfile.role, 'Administrador');
  await profile('HISTORY', update.id, seller); await profile('HISTORY', update.id, other, 404);
  // A different account sharing the same commercial must never substitute for creator.
  await db.user.update({ where: { id: users[1].id }, data: { salespersonId: reps[1].id } });
  const reassigned = await profile('SERVICE', service.id, admin);
  assert.equal(reassigned.name, reps[1].name); assert.equal(reassigned.commercial, reps[0].name);
  const legacy = await db.service.create({ data: { company: prefix + ' legacy', amount: 10, serviceDate: new Date('2099-10-01'), courseId: course.id, salespersonId: reps[0].id } }); services.push(legacy.id);
  assert.equal((await profile('SERVICE', legacy.id, admin)).state, 'unknown');
  await profile('SERVICE', 'not-found', admin, 404); await profile('USER', users[1].id, admin, 400);
  await profile('SERVICE', service.id, null, 401);
  await api('/api/record-profile?entity=SERVICE', admin, 'GET', undefined, 400);
  await api('/api/record-profile', supervisor, 'POST', {}, 403);
  await db.user.delete({ where: { id: users[1].id } });
  const deleted = await profile('CERTIFICATE', sale.id, admin);
  assert.equal(deleted.state, 'deleted'); assert.equal(deleted.avatar, null); assert.equal(deleted.name, 'Cuenta eliminada'); assert.equal(deleted.commercial, reps[0].name);
  assert.equal((await profile('QUOTATION', quote.id, admin)).state, 'deleted');
  await db.service.update({ where: { id: service.id }, data: { deletedAt: new Date() } });
  await profile('SERVICE', service.id, admin, 404);
  console.log(`PASS ${checks} HTTP checks: original authors, later edits, certificate copy attribution, shared commercial/reassignment, role scopes, private field exclusion, history actors, deleted accounts and legacy records.`);
} finally {
  await db.quotation.deleteMany({ where: { id: { in: quotes } } });
  await db.service.deleteMany({ where: { id: { in: services } } });
  await db.certificateSale.deleteMany({ where: { id: { in: sales } } });
  await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.salesperson.deleteMany({ where: { id: { in: reps.map(r => r.id) } } });
  if (course) await db.course.delete({ where: { id: course.id } });
  await db.$disconnect();
}
