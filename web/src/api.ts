import { mockApi } from './mockApi';
import type { ApiClient, ApiEnvelope, ReserveRequest, WeekSchedule } from './types';

const isLocal =
  import.meta.env.VITE_APP_ENV === 'local' ||
  typeof window.google?.script?.run === 'undefined';

function callServer<T>(name: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) {
      reject(new Error('google.script.run is unavailable'));
      return;
    }

    const callable = runner
      .withSuccessHandler<ApiEnvelope<T>>((result) => {
        if (result.ok) {
          resolve(result.data);
        } else {
          reject(new Error(result.error.message));
        }
      })
      .withFailureHandler((error) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      })[name];

    if (typeof callable !== 'function') {
      reject(new Error(`Server function is unavailable: ${name}`));
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
