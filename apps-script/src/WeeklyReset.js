var LaundryWeeklyReset = (function () {
  var DEFAULT_TEMPLATE_SHEET_NAME = 'ScheduleTemplate';
  var DEFAULT_TARGET_SHEET_NAMES = ['Haier 1', 'Haier 2', 'Haier 3', 'Haier 4'];
  var DEFAULT_WEEK_START_DAY = 'MONDAY';
  var DEFAULT_TRIGGER_HOUR = 0;
  var DEFAULT_DATE_LOCALE = 'en';
  var RESET_FUNCTION_NAME = 'resetWeeklySchedule';

  var WEEK_DAYS = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6
  };

  var SCRIPT_APP_WEEK_DAYS = {
    SUNDAY: 'SUNDAY',
    MONDAY: 'MONDAY',
    TUESDAY: 'TUESDAY',
    WEDNESDAY: 'WEDNESDAY',
    THURSDAY: 'THURSDAY',
    FRIDAY: 'FRIDAY',
    SATURDAY: 'SATURDAY'
  };

  function property(name, fallback) {
    var value = PropertiesService.getScriptProperties().getProperty(name);
    value = String(value || '').trim();
    return value || fallback;
  }

  function targetSheetNames() {
    return property('SCHEDULE_TARGET_SHEET_NAMES', DEFAULT_TARGET_SHEET_NAMES.join(','))
      .split(',')
      .map(function (name) { return String(name || '').trim(); })
      .filter(function (name) { return name; });
  }

  function normalizedWeekDay(value, fallback) {
    var normalized = String(value || fallback || '').trim().toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(WEEK_DAYS, normalized)) {
      throw new Error('Unsupported week day: ' + value);
    }
    return normalized;
  }

  function numberProperty(name, fallback, min, max) {
    var raw = property(name, String(fallback));
    var parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max || Math.floor(parsed) !== parsed) {
      throw new Error('Invalid numeric setting: ' + name);
    }
    return parsed;
  }

  function config() {
    return {
      templateSheetName: property('SCHEDULE_TEMPLATE_SHEET_NAME', DEFAULT_TEMPLATE_SHEET_NAME),
      targetSheetNames: targetSheetNames(),
      weekStartDay: normalizedWeekDay(property('SCHEDULE_WEEK_START_DAY', DEFAULT_WEEK_START_DAY), DEFAULT_WEEK_START_DAY),
      dateLocale: property('SCHEDULE_DATE_LOCALE', DEFAULT_DATE_LOCALE),
      triggerHour: numberProperty('SCHEDULE_RESET_TRIGGER_HOUR', DEFAULT_TRIGGER_HOUR, 0, 23)
    };
  }

  function parseIsoDate(value) {
    var parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) {
      throw new Error('Invalid ISO date: ' + value);
    }
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  }

  function dateOnly(date, timezone) {
    if (typeof Utilities !== 'undefined') {
      return parseIsoDate(Utilities.formatDate(date, timezone, 'yyyy-MM-dd'));
    }
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
  }

  function startOfWeek(date, weekStartDay, timezone) {
    var normalized = normalizedWeekDay(weekStartDay, DEFAULT_WEEK_START_DAY);
    var current = dateOnly(date, timezone || 'UTC');
    var delta = (current.getUTCDay() - WEEK_DAYS[normalized] + 7) % 7;
    current.setUTCDate(current.getUTCDate() - delta);
    return current;
  }

  function addDays(date, days) {
    var copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + Number(days || 0));
    return copy;
  }

  function formatDate(date, timezone, pattern) {
    if (typeof Utilities !== 'undefined') {
      return Utilities.formatDate(date, timezone || 'UTC', pattern || 'dd.MM.yyyy');
    }
    var day = String(date.getUTCDate()).padStart(2, '0');
    var month = String(date.getUTCMonth() + 1).padStart(2, '0');
    var year = String(date.getUTCFullYear());
    return (pattern || 'dd.MM.yyyy')
      .replace(/yyyy/g, year)
      .replace(/MM/g, month)
      .replace(/dd/g, day);
  }

  function localizedDefaultPattern(locale) {
    return String(locale || '').toLowerCase().indexOf('ru') === 0 ? 'dd.MM.yyyy' : 'yyyy-MM-dd';
  }

  function replaceDateTagsInValue(value, weekStart, timezone, locale) {
    if (typeof value !== 'string' || value.indexOf('{{date:') === -1) return value;

    var exactMatch = value.match(/^\{\{date:([+-]?\d+)(?:\|([^}]+))?\}\}$/);
    if (exactMatch && !exactMatch[2]) {
      return addDays(weekStart, Number(exactMatch[1]));
    }

    return value.replace(/\{\{date:([+-]?\d+)(?:\|([^}]+))?\}\}/g, function (_, offset, pattern) {
      return formatDate(
        addDays(weekStart, Number(offset)),
        timezone,
        pattern || localizedDefaultPattern(locale)
      );
    });
  }

  function replaceDateTagsInValues(values, weekStart, timezone, locale) {
    return values.map(function (row) {
      return row.map(function (value) {
        return replaceDateTagsInValue(value, weekStart, timezone, locale);
      });
    });
  }

  function ensureSheetSize(sheet, rows, columns) {
    if (sheet.getMaxRows() < rows) {
      sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
    }
    if (sheet.getMaxColumns() < columns) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
    }
    if (sheet.getMaxRows() > rows) {
      sheet.deleteRows(rows + 1, sheet.getMaxRows() - rows);
    }
    if (sheet.getMaxColumns() > columns) {
      sheet.deleteColumns(columns + 1, sheet.getMaxColumns() - columns);
    }
  }

  function resetTargetSheet(templateSheet, targetSheet, weekStart, timezone, locale) {
    var sourceRange = templateSheet.getDataRange();
    var rows = sourceRange.getNumRows();
    var columns = sourceRange.getNumColumns();
    ensureSheetSize(targetSheet, rows, columns);

    targetSheet.clear({ contentsOnly: false });
    sourceRange.copyTo(targetSheet.getRange(1, 1, rows, columns), { contentsOnly: false });

    var targetRange = targetSheet.getRange(1, 1, rows, columns);
    var values = replaceDateTagsInValues(targetRange.getValues(), weekStart, timezone, locale);
    targetRange.setValues(values);
    targetSheet.setFrozenRows(templateSheet.getFrozenRows());
    targetSheet.setFrozenColumns(templateSheet.getFrozenColumns());
  }

  function resetWeeklySchedule(referenceDate) {
    var options = config();
    if (!options.targetSheetNames.length) {
      throw new Error('SCHEDULE_TARGET_SHEET_NAMES must contain at least one sheet name');
    }

    var spreadsheet = LaundrySheets.getSpreadsheet();
    var templateSheet = spreadsheet.getSheetByName(options.templateSheetName);
    if (!templateSheet) {
      throw new Error('Schedule template sheet not found: ' + options.templateSheetName);
    }

    var timezone = spreadsheet.getSpreadsheetTimeZone();
    var weekStart = startOfWeek(referenceDate || new Date(), options.weekStartDay, timezone);
    var report = {
      templateSheetName: options.templateSheetName,
      targetSheetNames: [],
      weekStart: formatDate(weekStart, timezone, 'yyyy-MM-dd'),
      timezone: timezone
    };

    options.targetSheetNames.forEach(function (sheetName) {
      if (sheetName === options.templateSheetName) {
        throw new Error('Target sheet cannot be the template sheet: ' + sheetName);
      }

      var targetSheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
      resetTargetSheet(templateSheet, targetSheet, weekStart, timezone, options.dateLocale);
      report.targetSheetNames.push(sheetName);
    });

    return report;
  }

  function removeWeeklyResetTriggers() {
    var removed = 0;
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() === RESET_FUNCTION_NAME) {
        ScriptApp.deleteTrigger(trigger);
        removed += 1;
      }
    });
    return { removed: removed };
  }

  function installWeeklyResetTrigger() {
    var options = config();
    var removed = removeWeeklyResetTriggers().removed;
    var weekDayName = SCRIPT_APP_WEEK_DAYS[options.weekStartDay];
    ScriptApp.newTrigger(RESET_FUNCTION_NAME)
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay[weekDayName])
      .atHour(options.triggerHour)
      .create();
    return {
      removed: removed,
      installed: true,
      functionName: RESET_FUNCTION_NAME,
      weekDay: options.weekStartDay,
      hour: options.triggerHour
    };
  }

  return {
    installWeeklyResetTrigger: installWeeklyResetTrigger,
    removeWeeklyResetTriggers: removeWeeklyResetTriggers,
    resetWeeklySchedule: resetWeeklySchedule,
    _test: {
      addDays: addDays,
      replaceDateTagsInValues: replaceDateTagsInValues,
      startOfWeek: startOfWeek
    }
  };
})();
