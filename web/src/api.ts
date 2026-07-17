import { mockApi } from './mockApi';
import type { ApiClient, ApiEnvelope, ReserveRequest, WeekSchedule } from './types';

const isLocal =
  import.meta.env.VITE_APP_ENV === 'local' ||
  typeof window.google?.script?.run === 'undefined';

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function logClientPerf(name: string, status: string, startedAt: number, error?: unknown) {
  const payload: {
    operation: string;
    status: string;
    totalMs: number;
    error?: string;
  } = {
    operation: name,
    status,
    totalMs: Math.round(nowMs() - startedAt)
  };

  if (error) {
    payload.error = error instanceof Error ? error.message : String(error);
  }

  console.log(`PERF_CLIENT ${JSON.stringify(payload)}`);
}

function callServer<T>(name: string, ...args: unknown[]): Promise<T> {
  const startedAt = nowMs();

  return new Promise((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) {
      const error = new Error('google.script.run is unavailable');
      logClientPerf(name, 'unavailable', startedAt, error);
      reject(error);
      return;
    }

    const callable = runner
      .withSuccessHandler<ApiEnvelope<T>>((result) => {
        if (result.ok) {
          logClientPerf(name, 'ok', startedAt);
          resolve(result.data);
        } else {
          const error = new Error(result.error.message);
          logClientPerf(name, 'error', startedAt, error);
          reject(error);
        }
      })
      .withFailureHandler((error) => {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        logClientPerf(name, 'failure', startedAt, normalizedError);
        reject(normalizedError);
      })[name];

    if (typeof callable !== 'function') {
      const error = new Error(`Server function is unavailable: ${name}`);
      logClientPerf(name, 'unavailable', startedAt, error);
      reject(error);
      return;
    }

    callable(...args);
  });
}

const googleScriptApi: ApiClient = {
  getWeekSchedule: (weekStart?: string) => callServer<WeekSchedule>('getWeekSchedule', weekStart),
  reserveSlot: (request: ReserveRequest) => callServer<WeekSchedule>('reserveSlot', request),
  cancelReservation: (reservationId: string, weekStart: string) =>
    callServer<WeekSchedule>('cancelReservation', reservationId, weekStart),
  getCurrentUserProbe: () => callServer('getCurrentUserProbe'),
  sendTestTelegramNotification: () => callServer('sendTestTelegramNotification'),
  throwTestErrorForLogging: () => callServer('throwTestErrorForLogging')
};

export const api: ApiClient = isLocal ? mockApi : googleScriptApi;
