var LaundryErrorLog = (function () {
  function record(entry) {
    var telegramStatus = 'skipped';
    try {
      var notificationResult = LaundryNotifications.notifyError(entry);
      telegramStatus = notificationResult.status;
      if (notificationResult.description) {
        telegramStatus += ': ' + notificationResult.description;
      }
    } catch (notificationError) {
      telegramStatus = 'failed';
      console.error('Telegram notification failed', notificationError);
    }

    LaundrySheets.appendObject(LAUNDRY.SHEETS.ERROR_LOG, LAUNDRY.HEADERS.ErrorLog, {
      timestamp: new Date(),
      severity: entry.severity || 'error',
      context: entry.context || '',
      actor_email: entry.actorEmail || '',
      message: entry.message || '',
      stack: entry.stack || '',
      details_json: JSON.stringify(entry.details || {}),
      telegram_status: telegramStatus
    });
  }

  return {
    record: record
  };
})();
