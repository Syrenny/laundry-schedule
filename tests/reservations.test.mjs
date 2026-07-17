import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const reservationsSource = readFileSync(
  new URL('../apps-script/src/Reservations.js', import.meta.url),
  'utf8'
);

function formatDate(date, timezone, pattern) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  if (pattern === 'yyyy-MM-dd') return `${parts.year}-${parts.month}-${parts.day}`;
  if (pattern === 'HH:mm') return `${parts.hour}:${parts.minute}`;
  throw new Error(`Unsupported date pattern in test: ${pattern}`);
}

function makeRuntime(reservations, metrics = {}) {
  const rows = reservations.map((row) => ({ ...row }));
  const cache = new Map();
  const context = {
    Date,
    console: {
      log: (message) => {
        metrics.logs ??= [];
        metrics.logs.push(String(message));
      },
      error: console.error
    },
    Utilities: { formatDate },
    LAUNDRY: {
      SHEETS: { MACHINES: 'Machines', RESERVATIONS: 'Reservations' },
      HEADERS: { Reservations: [] }
    },
    LaundryConfig: {
      getConfig: () => ({
        appEnv: 'staging',
        timezone: 'Asia/Novosibirsk',
        weekStart: '2026-07-20',
        slotStartHour: 11,
        slotCount: 1,
        slotDurationMinutes: 60,
        maxActiveReservationsPerUser: 10,
        scheduleVersion: 1
      })
    },
    LaundryUsers: {
      resolveCurrentUser: () => ({
        email: 'student@example.com',
        displayName: 'Student',
        room: '409',
        role: 'user'
      })
    },
    LaundrySheets: {
      readObjects: (sheet) => {
        metrics.reads ??= {};
        metrics.reads[sheet] = (metrics.reads[sheet] || 0) + 1;
        return sheet === 'Machines'
          ? [{ id: 'haier_1', name: 'Haier 1', enabled: true, sort_order: 1 }]
          : rows;
      },
      appendObject: () => {
        metrics.appends = (metrics.appends || 0) + 1;
      },
      updateObjectById: () => {},
      getSpreadsheet: () => ({
        getName: () => 'Test Laundry',
        getSpreadsheetTimeZone: () => 'Etc/GMT-8'
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => null })
    },
    CacheService: metrics.cache
      ? {
          getScriptCache: () => ({
            get: (key) => cache.get(key) || null,
            put: (key, value) => cache.set(key, value),
            remove: (key) => cache.delete(key)
          })
        }
      : undefined,
    LaundryAuditLog: { record: () => {} },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} })
    }
  };

  vm.createContext(context);
  vm.runInContext(reservationsSource, context);
  return context.LaundryReservations;
}

function sheetReservation() {
  return {
    id: '20260720_1100_haier_1_student_1',
    date: new Date('2026-07-19T16:00:00.000Z'),
    start_time: new Date('1899-12-30T03:00:00.000Z'),
    end_time: new Date('1899-12-30T04:00:00.000Z'),
    machine_id: 'haier_1',
    email: 'student@example.com',
    display_name: 'Student',
    room: '409',
    status: 'active'
  };
}

test('getWeekSchedule сопоставляет Date из Google Sheets со слотом', () => {
  const api = makeRuntime([sheetReservation()]);
  const schedule = api.getWeekSchedule('2026-07-20');
  const slot = schedule.slots.find(
    (item) => item.date === '2026-07-20' && item.startTime === '11:00' && item.machineId === 'haier_1'
  );

  assert.equal(slot?.status, 'mine');
  assert.equal(slot?.reservationId, '20260720_1100_haier_1_student_1');
});

test('reserveSlot обнаруживает конфликт, когда дата и время из Sheets имеют тип Date', () => {
  const api = makeRuntime([sheetReservation()]);

  assert.throws(
    () =>
      api.reserveSlot({
        date: '2026-07-20',
        startTime: '11:00',
        machineId: 'haier_1',
        weekStart: '2026-07-20'
      }),
    /Slot is already occupied/
  );
});

test('reserveSlot строит ответ без повторного чтения листов', () => {
  const metrics = {};
  const api = makeRuntime([], metrics);
  const schedule = api.reserveSlot({
    date: '2026-07-20',
    startTime: '11:00',
    machineId: 'haier_1',
    weekStart: '2026-07-20'
  });
  const slot = schedule.slots.find(
    (item) => item.date === '2026-07-20' && item.startTime === '11:00' && item.machineId === 'haier_1'
  );

  assert.equal(slot?.status, 'mine');
  assert.equal(metrics.reads.Machines, 1);
  assert.equal(metrics.reads.Reservations, 1);
  assert.equal(metrics.appends, 1);
  const profile = JSON.parse(metrics.logs.find((line) => line.startsWith('PERF ')).slice(5));
  assert.equal(profile.operation, 'reserveSlot');
  assert.equal(profile.status, 'ok');
  assert.equal(typeof profile.totalMs, 'number');
  assert.deepEqual(Object.keys(profile.phasesMs), [
    'lock',
    'config',
    'spreadsheetTimezone',
    'user',
    'machines',
    'reservations',
    'reservationWrite',
    'auditWrite',
    'build'
  ]);
});

test('getWeekSchedule кеширует справочники и Reservations для расписания', () => {
  const metrics = { cache: true };
  const api = makeRuntime([], metrics);

  api.getWeekSchedule('2026-07-20');
  api.getWeekSchedule('2026-07-20');

  assert.equal(metrics.reads.Machines, 1);
  assert.equal(metrics.reads.Reservations, 1);
});

test('reserveSlot сбрасывает кеш Reservations для расписания', () => {
  const metrics = { cache: true };
  const api = makeRuntime([], metrics);

  api.getWeekSchedule('2026-07-20');
  api.getWeekSchedule('2026-07-20');
  api.reserveSlot({
    date: '2026-07-20',
    startTime: '11:00',
    machineId: 'haier_1',
    weekStart: '2026-07-20'
  });
  api.getWeekSchedule('2026-07-20');

  assert.equal(metrics.reads.Machines, 1);
  assert.equal(metrics.reads.Reservations, 3);
});

test('cancelReservation строит ответ без повторного чтения расписания', () => {
  const metrics = {};
  const api = makeRuntime([sheetReservation()], metrics);
  const schedule = api.cancelReservation('20260720_1100_haier_1_student_1', '2026-07-20');
  const slot = schedule.slots.find(
    (item) => item.date === '2026-07-20' && item.startTime === '11:00' && item.machineId === 'haier_1'
  );

  assert.equal(slot?.status, 'free');
  assert.equal(metrics.reads.Machines, 1);
  assert.equal(metrics.reads.Reservations, 1);
  const profile = JSON.parse(metrics.logs.find((line) => line.startsWith('PERF ')).slice(5));
  assert.equal(profile.operation, 'cancelReservation');
  assert.equal(profile.status, 'ok');
  assert.deepEqual(Object.keys(profile.phasesMs), [
    'lock',
    'config',
    'spreadsheetTimezone',
    'user',
    'machines',
    'reservations',
    'reservationWrite',
    'auditWrite',
    'build'
  ]);
});

test('getReservationsProbe объясняет сопоставление строки со слотом', () => {
  const api = makeRuntime([sheetReservation()]);
  const probe = api.getReservationsProbe('2026-07-20');

  assert.equal(probe.spreadsheetName, 'Test Laundry');
  assert.deepEqual(
    JSON.parse(JSON.stringify(probe.rows[0])),
    {
      id: '20260720_1100_haier_1_student_1',
      rawDateType: '[object Date]',
      rawDate: 'Sun Jul 19 2026 16:00:00 GMT+0000 (Coordinated Universal Time)',
      normalizedDate: '2026-07-20',
      rawStartTimeType: '[object Date]',
      rawStartTime: 'Sat Dec 30 1899 03:00:00 GMT+0000 (Coordinated Universal Time)',
      normalizedStartTime: '11:00',
      machineId: 'haier_1',
      status: 'active',
      matchesWeek: true,
      matchesTime: true,
      matchesMachine: true,
      slotKey: '2026-07-20|11:00|haier_1'
    }
  );
});
