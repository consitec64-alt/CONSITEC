import assert from 'node:assert/strict';
import { bookedSessions, conflictingDays, sessionsOverlap } from '../lib/instructor-availability';
const session = (startTime?: string, endTime?: string, day = '2098-10-16') => ({ date: new Date(`${day}T09:00:00Z`), startTime, endTime });
const morning = session('09:00', '12:00');
assert.equal(sessionsOverlap(morning, session('11:00', '13:00')), true);
assert.equal(sessionsOverlap(morning, session('10:00', '11:00')), true);
assert.equal(sessionsOverlap(morning, session('08:00', '13:00')), true);
assert.equal(sessionsOverlap(morning, morning), true);
assert.equal(sessionsOverlap(morning, session('12:00', '14:00')), false);
assert.equal(sessionsOverlap(morning, session('07:00', '09:00')), false);
assert.equal(sessionsOverlap(morning, session('14:00', '16:00')), false);
assert.equal(sessionsOverlap(morning, session()), true);
assert.equal(sessionsOverlap(session(), morning), true);
assert.equal(sessionsOverlap(morning, session('09:00', '12:00', '2098-10-17')), false);
assert.equal(sessionsOverlap(session('08:00', '18:00'), session('13:00', '14:00')), true);
const booked = bookedSessions({serviceDate: morning.date, dates: [morning]});
assert.equal(booked.length, 1);
assert.deepEqual(conflictingDays([session('12:00', '14:00')], booked), []);
assert.deepEqual(conflictingDays([morning, morning, session('09:00', '10:00', '2098-10-17')], booked), ['2098-10-16']);
assert.equal(bookedSessions({serviceDate: morning.date, dates: []}).length, 1);
assert.equal(bookedSessions({serviceDate: null, dates: []}).length, 0);
console.log('PASS: overlaps, adjacency, different dates, unknown hours, breaks, legacy dates and multiple sessions');

// Verify the transactional guard scans all bookings and retains self-exclusion.
async function checkGuard() {
  const { assertInstructorsAvailable, InstructorUnavailable } = await import('../lib/service-scheduling');
  const locks: string[] = [];
  const queries: any[] = [];
  const tx = {
    $queryRaw: async (_sql: unknown, id: string) => { locks.push(id); },
    service: { findMany: async (query: unknown) => {
      queries.push(query);
      return [
        {serviceDate: morning.date, dates: [session('07:00', '08:00')]},
        {serviceDate: morning.date, dates: [morning]},
      ];
    } },
    instructor: {findUnique: async () => ({name:'Instructor de prueba'})},
  } as any;
  await assert.rejects(() => assertInstructorsAvailable(tx, ['b', 'a'], [session('11:00', '13:00')], 'self'), InstructorUnavailable);
  assert.deepEqual(locks, ['a', 'b']);
  assert.deepEqual(queries[0].where.id, {not:'self'});
  assert.equal(queries[0].where.AND[0].deletedAt, null);
  await assertInstructorsAvailable(tx, ['a'], [session('12:00', '14:00')]);
  await assert.rejects(() => assertInstructorsAvailable(tx, ['a'], [session()]), InstructorUnavailable);
  console.log('PASS: transactional guard, multiple bookings, locks, self-exclusion and deleted records filter');
}
checkGuard().catch(error => { console.error(error); process.exitCode = 1; });
