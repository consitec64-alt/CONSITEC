import assert from 'node:assert/strict';
import { SignJWT } from 'jose/jwt/sign';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const username = process.env.SMOKE_USERNAME || process.env.ADMIN_USERNAME || 'admin';
const password = process.env.SMOKE_PASSWORD || process.env.ADMIN_PASSWORD;
if (!password) throw new Error('Set SMOKE_PASSWORD (or ADMIN_PASSWORD) for an isolated test database');
const api = (path, options = {}) => fetch(new URL(path, base), { redirect: 'manual', ...options });
const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const period = 'month=10&year=2026';
const privatePaths = ['/api/dashboard', '/api/services', '/api/certificate-sales', '/api/metadata/courses', '/api/metadata/instructors', '/api/metadata/locations', '/api/metadata/salespeople'];
for (const path of privatePaths) assert.equal((await api(`${path}?${period}`)).status, 401, path);
assert.equal((await api('/dashboard')).status, 307);
assert.equal((await api('/api/metadata/courses', { headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' } })).status, 401);
assert.equal((await api('/api/auth/login', { ...json({ username, password: 'incorrect-password' }) })).status, 401);
assert.equal((await api('/api/auth/login', { ...json({ username, password }), headers: { ...json({}).headers, origin: 'https://untrusted.example' } })).status, 403);
const login = await api('/api/auth/login', json({ username, password }));
assert.equal(login.status, 200);
const setCookie = login.headers.get('set-cookie');
assert.match(setCookie, /HttpOnly/i);
assert.match(setCookie, /SameSite=lax/i);
if (process.env.SMOKE_PRODUCTION === '1') assert.match(setCookie, /Secure/i);
const cookie = setCookie.split(';')[0];
const headers = { Cookie: cookie };
assert.equal((await api('/api/metadata/courses', { headers: { Cookie: cookie + 'tampered' } })).status, 401);
if (process.env.AUTH_SECRET) {
  const expired = await new SignJWT({ username, role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject('smoke-test')
    .setIssuer('consitec').setAudience('consitec-panel')
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  assert.equal((await api('/api/metadata/courses', { headers: { Cookie: `consitec_session=${expired}` } })).status, 401);
}
assert.equal((await api('/dashboard', { headers })).status, 200);
const coursesResponse = await api('/api/metadata/courses', { headers });
assert.equal(coursesResponse.status, 200);
assert.match(coursesResponse.headers.get('cache-control'), /no-store/);
const courses = await coursesResponse.json();
assert(courses.length >= 4);
const reps = await (await api('/api/metadata/salespeople', { headers })).json();
const before = await (await api(`/api/dashboard?${period}`, { headers })).json();
assert(Number.isFinite(before.totalServices));
const created = [];
try {
  const serviceResponse = await api('/api/services', { ...json({ company: 'Vercel smoke test', correlativeCode: '0042', courseId: courses[0].id, salespersonId: reps[0].id, instructorId: null, locationId: null, certificatesOnly: false, amount: 125.50, serviceDate: '2026-10-06T09:00:00.000Z', status: 'SCHEDULED' }), headers: { ...headers, 'Content-Type': 'application/json' } });
  assert.equal(serviceResponse.status, 201);
  const service = await serviceResponse.json();
  created.push(`/api/services/${service.id}`);
  const after = await (await api(`/api/dashboard?${period}`, { headers })).json();
  assert.equal(after.totalServices, before.totalServices + 1);
  assert.equal(after.totalEstimatedBilling, before.totalEstimatedBilling + 125.50);
  const saleResponse = await api('/api/certificate-sales', { ...json({ customerName: 'Vercel smoke test', customerType: 'NATURAL_PERSON', courseId: courses[0].id, salespersonId: reps[0].id, amount: 80, saleDate: '2026-10-06T09:00:00.000Z', status: 'EXECUTED' }), headers: { ...headers, 'Content-Type': 'application/json' } });
  assert.equal(saleResponse.status, 201);
  const sale = await saleResponse.json();
  created.push(`/api/certificate-sales/${sale.id}`);
  const sales = await (await api(`/api/certificate-sales?${period}`, { headers })).json();
  assert(sales.some(item => item.id === sale.id));
} finally {
  for (const path of created.reverse()) assert.equal((await api(path, { method: 'DELETE', headers })).status, 200);
}
const logout = await api('/api/auth/logout', { method: 'POST', headers });
assert.equal(logout.status, 200);
assert.match(logout.headers.get('set-cookie'), /consitec_session=;/);
assert.equal((await api('/api/metadata/courses')).status, 401);
console.log('Smoke passed: authentication, protected pages/APIs, middleware bypass, CSRF, cookies, PostgreSQL reads/writes, dashboard totals, and logout.');
