var LaundryApi = (function () {
  function handle(context, fn) {
    try {
      return { ok: true, data: fn() };
    } catch (error) {
      var actorEmail = '';
      try {
        actorEmail = LaundryUsers.getCurrentUserEmail();
      } catch (ignored) {
        actorEmail = '';
      }

      var entry = {
        severity: 'error',
        context: context,
        actorEmail: actorEmail,
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : '',
        details: {}
      };

      try {
        LaundryErrorLog.record(entry);
      } catch (logError) {
        console.error('Failed to write ErrorLog', logError);
      }

      return {
        ok: false,
        error: {
          message: entry.message,
          context: context
        }
      };
    }
  }

  return {
    handle: handle
  };
})();
