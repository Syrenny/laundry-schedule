var LaundryConfig = (function () {
  function bool(value) {
    return String(value).toLowerCase() === 'true';
  }

  function number(value, name) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error('Invalid numeric setting: ' + name);
    }
    return parsed;
  }

  function dateSetting(value, timezone, name) {
    if (value instanceof Date) {
      return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
    }
    var normalized = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new Error('Invalid ' + name + ' setting, expected YYYY-MM-DD');
    }
    return normalized;
  }

  function readSettingsMap() {
    var rows = LaundrySheets.readObjects(LAUNDRY.SHEETS.SETTINGS);
    var settings = {};
    rows.forEach(function (row) {
      var key = String(row.key || '').trim();
      if (key) settings[key] = row.value;
    });
    LAUNDRY.SETTINGS_DEFAULTS.forEach(function (row) {
      if (!Object.prototype.hasOwnProperty.call(settings, row[0])) {
        settings[row[0]] = row[1];
      }
    });
    return settings;
  }

  function getConfig() {
    var settings = readSettingsMap();
    var props = PropertiesService.getScriptProperties();
    var appEnv = props.getProperty('APP_ENV') || String(settings.app_env || 'staging');
    var timezone = LaundrySheets.getSpreadsheet().getSpreadsheetTimeZone();
    var config = {
      appEnv: appEnv,
      timezone: timezone,
      weekStart: dateSetting(settings.week_start, timezone, 'week_start'),
      slotStartHour: number(settings.slot_start_hour, 'slot_start_hour'),
      slotCount: number(settings.slot_count, 'slot_count'),
      slotDurationMinutes: number(settings.slot_duration_minutes, 'slot_duration_minutes'),
      maxActiveReservationsPerUser: number(settings.max_active_reservations_per_user, 'max_active_reservations_per_user'),
      allowCancelBeforeMinutes: number(settings.allow_cancel_before_minutes, 'allow_cancel_before_minutes'),
      scheduleVersion: number(settings.schedule_version, 'schedule_version'),
      appStatus: String(settings.app_status || 'active'),
      telegramNotificationsEnabled: bool(settings.telegram_notifications_enabled),
      telegramMinSeverity: String(settings.telegram_min_severity || 'error'),
      requireUserAllowlist: bool(settings.require_user_allowlist)
    };

    if (config.slotCount < 1 || config.slotCount > 48) {
      throw new Error('slot_count must be between 1 and 48');
    }
    if (config.slotDurationMinutes < 15 || config.slotDurationMinutes > 240) {
      throw new Error('slot_duration_minutes must be between 15 and 240');
    }
    return config;
  }

  return {
    getConfig: getConfig
  };
})();
