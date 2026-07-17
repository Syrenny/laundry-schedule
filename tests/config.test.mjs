import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const configSource = readFileSync(new URL('../apps-script/src/Config.js', import.meta.url), 'utf8');

test('getConfig использует timezone таблицы и игнорирует устаревшую настройку', () => {
  const settings = {
    timezone: 'UTC',
    week_start: new Date('2026-07-19T16:00:00.000Z'),
    slot_start_hour: '5',
    slot_count: '24',
    slot_duration_minutes: '60',
    max_active_reservations_per_user: '1',
    allow_cancel_before_minutes: '0',
    schedule_version: '1',
    app_status: 'active',
    app_env: 'staging',
    telegram_notifications_enabled: 'TRUE',
    telegram_min_severity: 'error',
    require_user_allowlist: 'FALSE'
  };
  const context = {
    Date,
    LAUNDRY: { SHEETS: { SETTINGS: 'Settings' }, SETTINGS_DEFAULTS: [] },
    LaundrySheets: {
      readObjects: () => Object.entries(settings).map(([key, value]) => ({ key, value })),
      getSpreadsheet: () => ({ getSpreadsheetTimeZone: () => 'Etc/GMT-8' })
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => null })
    },
    Utilities: {
      formatDate: (date, timezone, pattern) => {
        assert.equal(timezone, 'Etc/GMT-8');
        assert.equal(pattern, 'yyyy-MM-dd');
        return '2026-07-20';
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(configSource, context);

  const config = context.LaundryConfig.getConfig();
  assert.equal(config.timezone, 'Etc/GMT-8');
  assert.equal(config.weekStart, '2026-07-20');
});
