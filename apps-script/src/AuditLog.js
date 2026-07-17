var LaundryAuditLog = (function () {
  function record(action, entityType, entityId, details) {
    var actor = '';
    try {
      actor = LaundryUsers.getCurrentUserEmail();
    } catch (ignored) {
      actor = '';
    }
    LaundrySheets.appendObject(LAUNDRY.SHEETS.AUDIT_LOG, LAUNDRY.HEADERS.AuditLog, {
      timestamp: new Date(),
      actor_email: actor,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      details_json: JSON.stringify(details || {})
    });
  }

  return {
    record: record
  };
})();
