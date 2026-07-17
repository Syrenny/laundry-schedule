var LaundrySheets = (function () {
  var spreadsheet;

  function getSpreadsheet() {
    if (spreadsheet) return spreadsheet;

    var props = PropertiesService.getScriptProperties();
    var env = props.getProperty('APP_ENV') || 'staging';
    var spreadsheetId = env === 'production'
      ? props.getProperty('PRODUCTION_SPREADSHEET_ID')
      : props.getProperty('STAGING_SPREADSHEET_ID');

    if (spreadsheetId) {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      return spreadsheet;
    }

    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      throw new Error('Spreadsheet id is not configured and no active spreadsheet is available');
    }
    return spreadsheet;
  }

  function getOrCreateSheet(name) {
    var spreadsheet = getSpreadsheet();
    return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  }

  function ensureHeader(sheet, headers) {
    var width = headers.length;
    var range = sheet.getRange(1, 1, 1, width);
    var current = range.getValues()[0];
    var hasValues = current.some(function (value) { return String(value || '').trim() !== ''; });

    if (!hasValues) {
      range.setValues([headers]);
      sheet.setFrozenRows(1);
      return { status: 'created' };
    }

    var mismatches = [];
    headers.forEach(function (header, index) {
      if (String(current[index] || '').trim() !== header) {
        mismatches.push({
          column: index + 1,
          expected: header,
          actual: current[index]
        });
      }
    });

    return mismatches.length ? { status: 'mismatch', mismatches: mismatches } : { status: 'ok' };
  }

  function appendMissingRows(sheet, keyColumnIndex, rows) {
    var lastRow = sheet.getLastRow();
    var existing = {};
    if (lastRow > 1) {
      var values = sheet.getRange(2, keyColumnIndex, lastRow - 1, 1).getValues();
      values.forEach(function (row) {
        var key = String(row[0] || '').trim();
        if (key) existing[key] = true;
      });
    }

    var missing = rows.filter(function (row) {
      return !existing[String(row[keyColumnIndex - 1] || '').trim()];
    });

    if (missing.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, missing.length, missing[0].length).setValues(missing);
    }
    return missing.length;
  }

  function readObjects(sheetName) {
    var sheet = getSpreadsheet().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return [];

    var values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    var headers = values[0].map(function (header) { return String(header || '').trim(); });
    return values.slice(1)
      .filter(function (row) { return row.some(function (cell) { return String(cell || '').trim() !== ''; }); })
      .map(function (row) {
        var object = {};
        headers.forEach(function (header, index) {
          if (header) object[header] = row[index];
        });
        return object;
      });
  }

  function appendObject(sheetName, headers, object, textHeaders) {
    var sheet = getOrCreateSheet(sheetName);
    ensureHeader(sheet, headers);
    var row = headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : '';
    });
    var rowNumber = sheet.getLastRow() + 1;
    var textColumns = (textHeaders || [])
      .map(function (header) { return headers.indexOf(header) + 1; })
      .filter(function (column) { return column > 0; })
      .sort(function (a, b) { return a - b; });
    var groupStart = 0;
    textColumns.forEach(function (column, index) {
      var nextColumn = textColumns[index + 1];
      if (!groupStart) groupStart = column;
      if (nextColumn !== column + 1) {
        sheet.getRange(rowNumber, groupStart, 1, column - groupStart + 1).setNumberFormat('@');
        groupStart = 0;
      }
    });
    sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  }

  function updateObjectById(sheetName, id, patch) {
    var sheet = getSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('Record not found: ' + id);

    var values = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
    var headers = values[0].map(function (header) { return String(header || '').trim(); });
    var idIndex = headers.indexOf('id');
    if (idIndex === -1) throw new Error('Sheet has no id column: ' + sheetName);

    for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
      if (String(values[rowIndex][idIndex]) === String(id)) {
        Object.keys(patch).forEach(function (key) {
          var columnIndex = headers.indexOf(key);
          if (columnIndex !== -1) {
            sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(patch[key]);
          }
        });
        return true;
      }
    }
    throw new Error('Record not found: ' + id);
  }

  function setupSheets() {
    var report = {};
    Object.keys(LAUNDRY.HEADERS).forEach(function (sheetName) {
      var sheet = getOrCreateSheet(sheetName);
      report[sheetName] = ensureHeader(sheet, LAUNDRY.HEADERS[sheetName]);
    });

    var settingsSheet = getOrCreateSheet(LAUNDRY.SHEETS.SETTINGS);
    var machinesSheet = getOrCreateSheet(LAUNDRY.SHEETS.MACHINES);
    report.settingsDefaultsAdded = appendMissingRows(settingsSheet, 1, LAUNDRY.SETTINGS_DEFAULTS);
    report.machineDefaultsAdded = appendMissingRows(machinesSheet, 1, LAUNDRY.MACHINES_DEFAULTS);

    LaundryAuditLog.record('setup', 'system', 'setupSheets', report);
    return report;
  }

  return {
    appendObject: appendObject,
    getOrCreateSheet: getOrCreateSheet,
    getSpreadsheet: getSpreadsheet,
    readObjects: readObjects,
    setupSheets: setupSheets,
    updateObjectById: updateObjectById
  };
})();
