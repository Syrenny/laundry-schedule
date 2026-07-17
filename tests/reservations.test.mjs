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

function makeRuntime(reservations) {
  const rows = reservations.map((row) => ({ ...row }));
  const context = {
    Date,
    console,
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
      readObjects: (sheet) =>
        sheet === 'Machines'
          ? [{ id: 'haier_1', name: 'Haier 1', enabled: true, sort_order: 1 }]
          : rows,
      appendObject: () => {},
      updateObjectById: () => {}
    },
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
    id: 'reservation-1',
    date: new Date('2026-07-19T17:00:00.000Z'),
    start_time: new Date('2026-07-20T04:00:00.000Z'),
    end_time: new Date('2026-07-20T05:00:00.000Z'),
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
  assert.equal(slot?.reservationId, 'reservation-1');
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
