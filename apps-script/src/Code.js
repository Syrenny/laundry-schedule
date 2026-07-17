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

function resetWeeklySchedule(referenceDate) {
  return LaundryApi.handle('resetWeeklySchedule', function () {
    return LaundryWeeklyReset.resetWeeklySchedule(referenceDate);
  });
}

function installWeeklyResetTrigger() {
  return LaundryApi.handle('installWeeklyResetTrigger', function () {
    return LaundryWeeklyReset.installWeeklyResetTrigger();
  });
}

function removeWeeklyResetTriggers() {
  return LaundryApi.handle('removeWeeklyResetTriggers', function () {
    return LaundryWeeklyReset.removeWeeklyResetTriggers();
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

function getReservationsProbe(weekStartIso) {
  var result = LaundryApi.handle('getReservationsProbe', function () {
    return LaundryReservations.getReservationsProbe(weekStartIso);
  });
  console.log(JSON.stringify(result));
  return result;
}

function reserveSlot(request) {
  return LaundryApi.handle('reserveSlot', function () {
    return LaundryReservations.reserveSlot(request);
  });
}

function cancelReservation(reservationId, weekStartIso) {
  return LaundryApi.handle('cancelReservation', function () {
    return LaundryReservations.cancelReservation(reservationId, weekStartIso);
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
