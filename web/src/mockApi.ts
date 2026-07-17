import type { ApiClient, ReserveRequest, Slot, WeekSchedule } from './types';

const machines = [
  { id: 'haier_1', name: 'Haier 1', enabled: true, sortOrder: 1 },
  { id: 'haier_2', name: 'Haier 2', enabled: true, sortOrder: 2 },
  { id: 'haier_3', name: 'Haier 3', enabled: true, sortOrder: 3 },
  { id: 'haier_4', name: 'Haier 4', enabled: true, sortOrder: 4 }
];

let reservations: Slot[] = [];

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function makeSchedule(weekStart = '2026-07-20'): WeekSchedule {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = iso(addDays(start, index));
    return { date, label: date };
  });

  if (reservations.length === 0) {
    reservations = [
      {
        id: `${days[0].date}|11:00|haier_1`,
        date: days[0].date,
        startTime: '11:00',
        endTime: '12:00',
        machineId: 'haier_1',
        status: 'occupied',
        reservationId: 'mock-other-1',
        occupantLabel: 'Комната 409'
      },
      {
        id: `${days[1].date}|18:00|haier_2`,
        date: days[1].date,
        startTime: '18:00',
        endTime: '19:00',
        machineId: 'haier_2',
        status: 'mine',
        reservationId: 'mock-mine-1',
        occupantLabel: 'Вы'
      }
    ];
  }

  const reserved = new Map(reservations.map((slot) => [`${slot.date}|${slot.startTime}|${slot.machineId}`, slot]));
  const slots: Slot[] = [];
  for (let hour = 5; hour < 29; hour += 1) {
    const startHour = hour % 24;
    const endHour = (hour + 1) % 24;
    const startTime = `${String(startHour).padStart(2, '0')}:00`;
    const endTime = `${String(endHour).padStart(2, '0')}:00`;
    for (const day of days) {
      for (const machine of machines) {
        const key = `${day.date}|${startTime}|${machine.id}`;
        const existing = reserved.get(key);
        slots.push(
          existing ?? {
            id: key,
            date: day.date,
            startTime,
            endTime,
            machineId: machine.id,
            status: 'free'
          }
        );
      }
    }
  }

  return {
    weekStart,
    timezone: 'Asia/Novosibirsk',
    currentUser: {
      email: 'student@example.com',
      displayName: 'Test Student',
      room: '409',
      role: 'user'
    },
    environment: 'local',
    machines,
    days,
    slots,
    scheduleVersion: 1
  };
}

function wait<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockApi: ApiClient = {
  getWeekSchedule: (weekStart?: string) => wait(makeSchedule(weekStart)),
  reserveSlot: async (request: ReserveRequest) => {
    if (request.startTime === '12:00') {
      throw new Error('Слот уже занят: mock conflict');
    }
    reservations.push({
      id: `${request.date}|${request.startTime}|${request.machineId}`,
      date: request.date,
      startTime: request.startTime,
      endTime: `${String((Number(request.startTime.slice(0, 2)) + 1) % 24).padStart(2, '0')}:00`,
      machineId: request.machineId,
      status: 'mine',
      reservationId: `mock-${Date.now()}`,
      occupantLabel: 'Вы'
    });
    return wait(makeSchedule(request.weekStart));
  },
  cancelReservation: async (reservationId: string, weekStart: string) => {
    reservations = reservations.filter((slot) => slot.reservationId !== reservationId);
    return wait(makeSchedule(weekStart));
  },
  getCurrentUserProbe: () => wait({ activeUserEmail: 'student@example.com', effectiveUserEmail: 'owner@example.com' }),
  sendTestTelegramNotification: () => wait({ status: 'sent' }),
  throwTestErrorForLogging: () => Promise.reject(new Error('Mock backend error'))
};
