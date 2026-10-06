import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Creates and removes accounts only in the isolated local database.
const db = new URL(process.env.DATABASE_URL);
assert(['localhost', '127.0.0.1'].includes(db.hostname) && db.pathname === '/consitec', 'Use the isolated local consitec database');
const prisma = new PrismaClient();
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const prefix = `test-${randomUUID()}`;
const password = randomUUID();
const ids = [];
const call = (path, cookie, body, method = body ? 'POST' : 'GET') => fetch(new URL(path, base), {
  redirect: 'manual', method,
  headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});
async function login(username, secret) {
  const res = await call('/api/auth/login', null, { username, password: secret });
  assert.equal(res.status, 200);
  return res.headers.get('set-cookie').split(';')[0];
}
try {
  const adminName = `${prefix}-root`;
  const fixture = await prisma.user.create({ data: { username: adminName, password: await bcrypt.hash(password, 12), role: 'ADMIN' } });
  ids.push(fixture.id);
  const admin = await login(adminName, password);
  const email = `${prefix}@example.test`;
  assert.equal((await call('/api/users')).status, 401);
  assert.equal((await call('/api/users', null, { email, password, role: 'SALES' })).status, 401);
  assert.equal((await call('/api/users', null, { id: fixture.id, email }, 'PATCH')).status, 401);
  assert.equal((await call('/dashboard/users', admin)).status, 200);
  assert.equal((await call('/api/auth/me', admin)).status, 200);
  const list = await call('/api/users', admin);
  assert.equal(list.status, 200);
  assert.match(list.headers.get('cache-control'), /no-store/);
  assert((await list.json()).every(user => !('password' in user)));
  for (const body of [
    { email: 'invalid', password, role: 'SALES' },
    { email: 'a..b@example.test', password, role: 'SALES' },
    { email, password: 'short', role: 'SALES' },
    { email, password: 'é'.repeat(37), role: 'SALES' },
    { email, password, role: 'OWNER' }
  ]) assert.equal((await call('/api/users', admin, body)).status, 400);
  for (const role of ['SALES', 'ADMIN']) {
    const address = `${prefix}-${role.toLowerCase()}@example.test`;
    const res = await call('/api/users', admin, { email: ` ${address.toUpperCase()} `, password, role });
    assert.equal(res.status, 201);
    const account = await res.json();
    ids.push(account.id);
    assert.deepEqual(Object.keys(account).sort(), ['id', 'role', 'username']);
    assert.equal(account.username, address);
    const stored = await prisma.user.findUnique({ where: { id: account.id } });
    assert.notEqual(stored.password, password);
    assert(await bcrypt.compare(password, stored.password));
    assert.equal((await call('/api/users', admin, { email: address.toUpperCase(), password, role })).status, 409);
    const cookie = await login(` ${address.toUpperCase()} `, password);
    if (role === 'SALES') {
      assert.equal((await call('/api/users', cookie)).status, 403);
      assert.equal((await call('/api/users', cookie, { email, password, role: 'ADMIN' })).status, 403);
      assert.equal((await call('/api/users', cookie, { id: account.id, email }, 'PATCH')).status, 403);
      assert.equal((await call('/dashboard/users', cookie)).status, 307);
    } else assert.equal((await call('/api/users', cookie)).status, 200);
  }
  assert.equal((await call('/api/users', admin, { id: fixture.id, email: 'invalid' }, 'PATCH')).status, 400);
  assert.equal((await call('/api/users', admin, { id: fixture.id, email: `${prefix}-sales@example.test` }, 'PATCH')).status, 409);
  assert.equal((await call('/api/users', admin, { id: 'missing-user', email }, 'PATCH')).status, 404);
  const crossOrigin = await fetch(new URL('/api/users', base), { method: 'PATCH', headers: { Cookie: admin, Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: fixture.id, email }) });
  assert.equal(crossOrigin.status, 403);
  const updated = await call('/api/users', admin, { id: fixture.id, email: email.toUpperCase() }, 'PATCH');
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).username, email);
  assert.equal((await prisma.user.findUnique({ where: { id: fixture.id } })).password, fixture.password);
  await login(email.toUpperCase(), password);
  assert.equal((await call('/api/auth/login', null, { username: adminName, password })).status, 401);
  assert.equal((await call('/api/users', admin)).status, 200, 'Email update preserves current session');
  await prisma.user.update({ where: { id: fixture.id }, data: { role: 'SALES' } });
  assert.equal((await call('/api/users', admin)).status, 403, 'Check database role, not stale JWT role');
  assert.equal((await call('/api/users', admin, { id: fixture.id, email }, 'PATCH')).status, 403);
  await prisma.user.delete({ where: { id: fixture.id } });
  assert.equal((await call('/api/users', admin)).status, 401);
  console.log('Users smoke passed: normalized email creation/login, legacy login, email changes, password preservation, hashing, validation, duplicates, CSRF, roles, stale sessions, and safe responses.');
} finally {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
}
