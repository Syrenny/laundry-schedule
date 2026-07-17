var LaundryNotifications = (function () {
  function getNotificationConfig() {
    try {
      return LaundryConfig.getConfig();
    } catch (error) {
      var props = PropertiesService.getScriptProperties();
      console.error('Falling back to notification config', error);
      return {
        appEnv: props.getProperty('APP_ENV') || 'staging',
        telegramNotificationsEnabled: true,
        telegramMinSeverity: 'error'
      };
    }
  }

  function shouldNotify(config, severity) {
    if (!config.telegramNotificationsEnabled) return false;
    var min = LAUNDRY.SEVERITY_ORDER[config.telegramMinSeverity] || LAUNDRY.SEVERITY_ORDER.error;
    var current = LAUNDRY.SEVERITY_ORDER[severity] || LAUNDRY.SEVERITY_ORDER.error;
    return current >= min;
  }

  function parseTelegramResponse(responseText) {
    try {
      return JSON.parse(responseText || '{}');
    } catch (error) {
      return { ok: false, description: 'Invalid JSON response: ' + String(responseText).slice(0, 200) };
    }
  }

  function sendTelegramMessage(text) {
    var config = getNotificationConfig();
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('TELEGRAM_BOT_TOKEN');
    var chatId = config.appEnv === 'production'
      ? props.getProperty('PRODUCTION_TELEGRAM_CHAT_ID')
      : props.getProperty('STAGING_TELEGRAM_CHAT_ID');

    if (!token || !chatId) {
      return {
        status: 'disabled',
        appEnv: config.appEnv,
        hasToken: Boolean(token),
        hasChatId: Boolean(chatId)
      };
    }

    var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });

    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    var parsed = parseTelegramResponse(responseText);
    if (responseCode < 200 || responseCode >= 300 || parsed.ok !== true) {
      return {
        status: 'failed',
        appEnv: config.appEnv,
        responseCode: responseCode,
        description: parsed.description || responseText.slice(0, 200)
      };
    }

    return {
      status: 'sent',
      appEnv: config.appEnv,
      responseCode: responseCode,
      messageId: parsed.result && parsed.result.message_id ? parsed.result.message_id : ''
    };
  }

  function notifyError(entry) {
    var config = getNotificationConfig();
    if (!shouldNotify(config, entry.severity || 'error')) {
      return { status: 'skipped' };
    }

    var text = [
      '[laundry-schedule][' + config.appEnv + '] ' + (entry.severity || 'error'),
      'context: ' + (entry.context || ''),
      'actor: ' + (entry.actorEmail || 'unknown'),
      'message: ' + (entry.message || '')
    ].join('\n');

    return sendTelegramMessage(text);
  }

  return {
    notifyError: notifyError,
    sendTelegramMessage: sendTelegramMessage
  };
})();
