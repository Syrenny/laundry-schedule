import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sheetsSource = readFileSync(new URL('../apps-script/src/Sheets.js', import.meta.url), 'utf8');

function makeRuntime(overrides = {}) {
  const spreadsheet = overrides.spreadsheet || {
    getSheetByName: () => null,
    insertSheet: () => null
  };
  const context = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => (key === 'STAGING_SPREADSHEET_ID' ? 'spreadsheet-id' : null)
      })
    },
    SpreadsheetApp: {
      openById: overrides.openById || (() => spreadsheet),
      getActiveSpreadsheet: () => spreadsheet
    },
    LAUNDRY: { HEADERS: {}, SHEETS: {} },
    LaundryAuditLog: { record: () => {} }
  };

  vm.createContext(context);
  vm.runInContext(sheetsSource, context);
  return context.LaundrySheets;
}

test('getSpreadsheet повторно использует открытый spreadsheet', () => {
  let openCount = 0;
  const spreadsheet = {};
  const sheets = makeRuntime({
    spreadsheet,
    openById: () => {
      openCount += 1;
      return spreadsheet;
    }
  });

  assert.equal(sheets.getSpreadsheet(), spreadsheet);
  assert.equal(sheets.getSpreadsheet(), spreadsheet);
  assert.equal(openCount, 1);
});

test('appendObject задаёт plain text до записи календарных полей', () => {
  const headers = ['id', 'date', 'start_time', 'end_time', 'created_at'];
  const events = [];
  const sheet = {
    getLastRow: () => 1,
    getRange: (row, column, height, width) => ({
      getValues: () => [headers],
      setNumberFormat: (format) => events.push({ type: 'format', row, column, height, width, format }),
      setValues: (values) => events.push({ type: 'values', row, column, height, width, values })
    })
  };
  const spreadsheet = {
    getSheetByName: () => sheet,
    insertSheet: () => sheet
  };
  const sheets = makeRuntime({ spreadsheet });
  sheets.appendObject(
    'Reservations',
    headers,
    {
      id: 'reservation-1',
      date: '2026-07-20',
      start_time: '05:00',
      end_time: '06:00',
      created_at: new Date('2026-07-17T00:00:00Z')
    },
    ['date', 'start_time', 'end_time']
  );

  assert.deepEqual(events[0], { type: 'format', row: 2, column: 2, height: 1, width: 3, format: '@' });
  assert.equal(events[1].type, 'values');
  assert.equal(events[1].values[0][1], '2026-07-20');
  assert.equal(events[1].values[0][2], '05:00');
  assert.equal(events[1].values[0][3], '06:00');
  assert.ok(events[1].values[0][4] instanceof Date);
});
