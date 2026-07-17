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

  return {
    getSpreadsheet: getSpreadsheet
  };
})();
