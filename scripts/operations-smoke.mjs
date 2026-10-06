import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const database = new URL(process.env.DATABASE_URL);
assert(['localhost', '127.0.0.1'].includes(database.hostname) && database.pathname === '/consitec', 'Use the isolated local database');
const prisma = new PrismaClient();
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const tag = `operations-${randomUUID()}`;
const password = randomUUID();
const users = [], records = [];
let restoreColor;
const api = (path, cookie, method = 'GET', body) => fetch(new URL(path, base), {
  redirect: 'manual', method,
  headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});
async function account(role, name) {
  const user = await prisma.user.create({ data: { username: `${tag}-${name}`, password: await bcrypt.hash(password, 12), role } });
  users.push(user.id);
  const response = await api('/api/auth/login', null, 'POST', { username: user.username, password });
  assert.equal(response.status, 200);
  return { ...user, cookie: response.headers.get('set-cookie').split(';')[0] };
}
try {
  const admin = await account('ADMIN', 'admin');
  const sales = await account('SALES', 'sales');
  const otherAdmin = await account('ADMIN', 'other');
  const courses = await (await api('/api/metadata/courses', admin.cookie)).json();
  const reps = await (await api('/api/metadata/salespeople', admin.cookie)).json();
  assert(courses.length >= 2 && reps.length >= 2);
  await prisma.user.update({where:{id:sales.id},data:{salespersonId:reps[0].id}});
  restoreColor = { id: reps[0].id, color: reps[0].color };
  assert.match(reps[0].color, /^#[0-9a-f]{6}$/);
  assert.equal((await api(`/api/metadata/salespeople/${reps[0].id}`, null, 'PATCH', { color: '#abcdef' })).status, 401);
  assert.equal((await api(`/api/metadata/salespeople/${reps[0].id}`, sales.cookie, 'PATCH', { color: 'url(untrusted)' })).status, 403);
  const color = await api(`/api/metadata/salespeople/${reps[0].id}`, admin.cookie, 'PATCH', { color: '#AB12CD' });
  assert.equal(color.status, 200);
  assert.equal((await color.json()).color, '#ab12cd');
  const shared = await (await api('/api/metadata/salespeople', otherAdmin.cookie)).json();
  assert.equal(shared.find(rep => rep.id === reps[0].id).color, '#ab12cd');
  assert.equal((await api('/api/metadata/salespeople/missing', admin.cookie, 'PATCH', { color: '#abcdef' })).status, 404);

  const saleBody = { customerName: tag, customerType: 'NATURAL_PERSON', amount: 100, saleDate: '2026-10-06T09:00:00.000Z', courseId: courses[0].id, salespersonId: reps[0].id, status: 'EXECUTED' };
  const saleResponse = await api('/api/certificate-sales', sales.cookie, 'POST', saleBody);
  assert.equal(saleResponse.status, 201);
  const sale = await saleResponse.json(); records.push({ model: 'certificateSale', id: sale.id });
  const changed = { ...saleBody, customerName: tag + ' edited', customerType: 'COMPANY', amount: 875.25, saleDate: '2026-11-01T09:00:00.000Z', courseId: courses[1].id, salespersonId: reps[1].id, status: 'INVOICED' };
  const beforeServices = await prisma.service.count();
  assert.equal((await api(`/api/certificate-sales/${sale.id}`, null, 'PATCH', changed)).status, 401);
  const edited = await api(`/api/certificate-sales/${sale.id}`, sales.cookie, 'PATCH', changed);
  assert.equal(edited.status, 200);
  const result = await edited.json();
  assert.equal(result.id, sale.id); assert.equal(result.customerName, changed.customerName);
  assert.equal(result.customerType, 'COMPANY'); assert.equal(Number(result.amount), 875.25);
  assert.equal(result.course.id, courses[1].id); assert.equal(result.salesperson.id, reps[0].id);
  assert.equal(result.status, 'INVOICED'); assert.equal(result.saleDate, changed.saleDate);
  assert.equal(await prisma.service.count(), beforeServices, 'Editing must not duplicate scheduled services');
  assert(!(await (await api('/api/certificate-sales?month=10&year=2026', admin.cookie)).json()).some(item => item.id === sale.id));
  assert((await (await api('/api/certificate-sales?month=11&year=2026', admin.cookie)).json()).some(item => item.id === sale.id));
  for (const changes of [{ amount: -1 }, { amount: 999999999 }, { amount: 1.234 }, { customerType: 'BAD' }, { status: 'BAD' }, { saleDate: '2026-02-31T09:00:00.000Z' }, { courseId: 'missing' }]) {
    assert.equal((await api(`/api/certificate-sales/${sale.id}`, admin.cookie, 'PATCH', { ...changed, ...changes })).status, 400);
  }
  assert.equal((await api('/api/certificate-sales/missing', admin.cookie, 'PATCH', changed)).status, 404);
  assert.equal((await fetch(new URL(`/api/certificate-sales/${sale.id}`, base), { method: 'PATCH', headers: { Cookie: sales.cookie, Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: JSON.stringify(changed) })).status, 403);

  const serviceBody = { company: tag, correlativeCode: '0042', amount: 125, serviceDate: '2026-10-06T09:00:00.000Z', courseId: courses[0].id, salespersonId: reps[0].id, instructorId: null, locationId: null, certificatesOnly: false, status: 'SCHEDULED' };
  const serviceResponse = await api('/api/services', sales.cookie, 'POST', serviceBody);
  assert.equal(serviceResponse.status, 201);
  const service = await serviceResponse.json(); records.push({ model: 'service', id: service.id });
  const before = await (await api('/api/dashboard?month=10&year=2026', admin.cookie)).json();
  const serviceChanges = { ...serviceBody, company: tag + ' updated service', amount: 225.50, serviceDate: '2026-10-09T09:00:00.000Z', status: 'EXECUTED', certificatesOnly: true };
  assert.equal((await api(`/api/services/${service.id}`, sales.cookie, 'PATCH', serviceChanges)).status, 200);
  const after = await (await api('/api/dashboard?month=10&year=2026', admin.cookie)).json();
  assert.equal(after.totalServices, before.totalServices);
  assert.equal(after.totalEstimatedBilling, before.totalEstimatedBilling + 100.50);
  assert.equal((await api(`/api/services/${service.id}`, admin.cookie, 'PATCH', { ...serviceChanges, instructorId: 'missing' })).status, 400);
  assert.equal((await api('/api/services/missing', admin.cookie, 'PATCH', serviceChanges)).status, 404);

  assert.equal((await api(`/api/users/${sales.id}`, null, 'DELETE')).status, 401);
  assert.equal((await api(`/api/users/${admin.id}`, sales.cookie, 'DELETE')).status, 403);
  assert.equal((await api(`/api/users/${admin.id}`, admin.cookie, 'DELETE')).status, 409);
  assert.equal((await api('/api/users/missing', admin.cookie, 'DELETE')).status, 404);
  assert.equal((await api(`/api/users/${otherAdmin.id}`, admin.cookie, 'DELETE')).status, 200);
  assert.equal((await api(`/api/users/${sales.id}`, admin.cookie, 'DELETE')).status, 200);
  for (const path of ['/api/auth/me', '/api/dashboard?month=10&year=2026', '/api/users', '/api/metadata/salespeople']) {
    assert.equal((await api(path, sales.cookie)).status, 401, 'Deleted accounts must lose all API access');
  }
  assert.equal((await api('/dashboard', sales.cookie)).status, 307);
  assert.equal((await api(`/api/certificate-sales/${sale.id}`, sales.cookie, 'PATCH', changed)).status, 401);
  assert(await prisma.certificateSale.findUnique({ where: { id: sale.id } }), 'Deleting accounts preserves sales');
  assert(await prisma.service.findUnique({ where: { id: service.id } }), 'Deleting accounts preserves services');
  console.log('Operations smoke passed: sale/service editing, validation, totals, shared colors, account deletion, self protection, immediate session revocation, CSRF, and preserved business records.');
} finally {
  for (const record of records.reverse()) await prisma[record.model].deleteMany({ where: { id: record.id } });
  if (restoreColor) await prisma.salesperson.update({ where: { id: restoreColor.id }, data: { color: restoreColor.color } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
}
