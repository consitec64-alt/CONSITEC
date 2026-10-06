import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// This test creates and removes accounts. Restrict it to the isolated local database.
const db = new URL(process.env.DATABASE_URL);
assert(['localhost', '127.0.0.1'].includes(db.hostname) && db.pathname === '/consitec', 'Use the isolated local consitec database');
const prisma = new PrismaClient();
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const prefix = `test-${randomUUID()}`;
const password = randomUUID();
const usernames = [];
const call = (path, cookie, body) => fetch(new URL(path, base), {
  redirect: 'manual', method: body ? 'POST' : 'GET',
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
  usernames.push(adminName);
  await prisma.user.create({ data: { username: adminName, password: await bcrypt.hash(password, 12), role: 'ADMIN' } });
  const admin = await login(adminName, password);
  assert.equal((await call('/api/users')).status, 401);
  assert.equal((await call('/api/users', null, { username: prefix, password, role: 'SALES' })).status, 401);
  assert.equal((await call('/dashboard/users', admin)).status, 200);
  assert.equal((await call('/api/auth/me', admin)).status, 200);
  const list = await call('/api/users', admin);
  assert.equal(list.status, 200);
  assert.match(list.headers.get('cache-control'), /no-store/);
  assert((await list.json()).every(user => !('password' in user)));
  for (const body of [
    { username: 'x', password, role: 'SALES' },
    { username: prefix, password: 'short', role: 'SALES' },
    { username: prefix, password: 'é'.repeat(37), role: 'SALES' },
    { username: prefix, password, role: 'OWNER' }
  ]) assert.equal((await call('/api/users', admin, body)).status, 400);
  for (const role of ['SALES', 'ADMIN']) {
    const username = `${prefix}-${role.toLowerCase()}`;
    usernames.push(username);
    const res = await call('/api/users', admin, { username, password, role });
    assert.equal(res.status, 201);
    assert.deepEqual(Object.keys(await res.json()).sort(), ['id', 'role', 'username']);
    const stored = await prisma.user.findUnique({ where: { username } });
    assert.notEqual(stored.password, password);
    assert(await bcrypt.compare(password, stored.password));
    assert.equal((await call('/api/users', admin, { username, password, role })).status, 409);
    const cookie = await login(username, password);
    if (role === 'SALES') {
      assert.equal((await call('/api/users', cookie)).status, 403);
      assert.equal((await call('/api/users', cookie, { username: prefix, password, role: 'ADMIN' })).status, 403);
      assert.equal((await call('/dashboard/users', cookie)).status, 307);
    } else assert.equal((await call('/api/users', cookie)).status, 200);
  }
  await prisma.user.update({ where: { username: adminName }, data: { role: 'SALES' } });
  assert.equal((await call('/api/users', admin)).status, 403, 'Check current database role, not stale JWT role');
  await prisma.user.delete({ where: { username: adminName } });
  assert.equal((await call('/api/users', admin)).status, 401);
  console.log('Users smoke passed: creation, hashing, login, validation, duplicates, admin authorization, stale sessions, and safe responses.');
} finally {
  await prisma.user.deleteMany({ where: { username: { in: usernames } } });
  await prisma.$disconnect();
}
