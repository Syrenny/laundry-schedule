import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sheetsSource = readFileSync(new URL('../apps-script/src/Sheets.js', import.meta.url), 'utf8');

function makeRuntime(overrides = {}) {
  const spreadsheet = overrides.spreadsheet || {};
  const context = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => (key === 'STAGING_SPREADSHEET_ID' ? 'spreadsheet-id' : null)
      })
    },
    SpreadsheetApp: {
      openById: overrides.openById || (() => spreadsheet),
      getActiveSpreadsheet: () => spreadsheet
    }
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
