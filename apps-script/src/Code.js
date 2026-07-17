function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Laundry Schedule')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupSheets() {
  return LaundryApi.handle('setupSheets', function () {
    return LaundrySheets.setupSheets();
  });
}

function getCurrentUserProbe() {
  return LaundryApi.handle('getCurrentUserProbe', function () {
    return LaundryUsers.getCurrentUserProbe();
  });
}

function getWeekSchedule(weekStartIso) {
  return LaundryApi.handle('getWeekSchedule', function () {
    return LaundryReservations.getWeekSchedule(weekStartIso);
  });
}

function reserveSlot(request) {
  return LaundryApi.handle('reserveSlot', function () {
    return LaundryReservations.reserveSlot(request);
  });
}

function cancelReservation(reservationId) {
  return LaundryApi.handle('cancelReservation', function () {
    return LaundryReservations.cancelReservation(reservationId);
  });
}

function sendTestTelegramNotification() {
  return LaundryApi.handle('sendTestTelegramNotification', function () {
    var result = LaundryNotifications.sendTelegramMessage('Test Telegram notification from laundry schedule');
    console.log(JSON.stringify(result));
    return result;
  });
}

function throwTestErrorForLogging() {
  return LaundryApi.handle('throwTestErrorForLogging', function () {
    throw new Error('Test error for ErrorLog and Telegram notification');
  });
}

function setRuntimeSecretsFromJson(jsonText) {
  return LaundryApi.handle('setRuntimeSecretsFromJson', function () {
    var parsed = JSON.parse(jsonText);
    PropertiesService.getScriptProperties().setProperties(parsed, true);
    return { ok: true, keys: Object.keys(parsed).sort() };
  });
}
