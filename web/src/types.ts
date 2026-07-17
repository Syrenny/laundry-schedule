export type Environment = 'local' | 'staging' | 'production';

export type Machine = {
  id: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
};

export type SlotStatus = 'free' | 'mine' | 'occupied' | 'disabled';

export type Slot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  machineId: string;
  status: SlotStatus;
  reservationId?: string;
  occupantLabel?: string;
};

export type WeekSchedule = {
  weekStart: string;
  timezone: string;
  currentUser: {
    email: string;
    displayName?: string;
    room?: string;
    role: 'user' | 'admin';
  };
  environment: Environment;
  machines: Machine[];
  days: Array<{ date: string; label: string }>;
  slots: Slot[];
  scheduleVersion: number;
};

export type ReserveRequest = {
  date: string;
  startTime: string;
  machineId: string;
  weekStart: string;
};

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; context?: string } };

export type ApiClient = {
  getWeekSchedule(weekStart?: string): Promise<WeekSchedule>;
  reserveSlot(request: ReserveRequest): Promise<WeekSchedule>;
  cancelReservation(reservationId: string, weekStart: string): Promise<WeekSchedule>;
  getCurrentUserProbe(): Promise<unknown>;
  sendTestTelegramNotification(): Promise<unknown>;
  throwTestErrorForLogging(): Promise<unknown>;
};
