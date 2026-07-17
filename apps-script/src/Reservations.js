var LaundryReservations = (function () {
  function isoDate(date) {
    return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
  }

  function normalizeStoredDate(value, timezone) {
    if (value instanceof Date) {
      return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
    }
    return String(value || '').trim();
  }

  function normalizeStoredTime(value, timezone) {
    if (value instanceof Date) {
      return Utilities.formatDate(value, timezone, 'HH:mm');
    }
    return String(value || '').trim();
  }

  function parseIsoDate(value) {
    var parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) {
      throw new Error('Invalid date: ' + value);
    }
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  }

  function addDays(date, days) {
    var copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function addMinutes(time, minutes) {
    var parts = String(time).split(':').map(Number);
    var total = parts[0] * 60 + parts[1] + minutes;
    return pad(Math.floor(total / 60) % 24) + ':' + pad(total % 60);
  }

  function slotTimes(config) {
    var result = [];
    for (var index = 0; index < config.slotCount; index += 1) {
      var minutes = (config.slotStartHour * 60) + index * config.slotDurationMinutes;
      var start = pad(Math.floor(minutes / 60) % 24) + ':' + pad(minutes % 60);
      result.push({
        startTime: start,
        endTime: addMinutes(start, config.slotDurationMinutes)
      });
    }
    return result;
  }

  function enabledMachines() {
    return LaundrySheets.readObjects(LAUNDRY.SHEETS.MACHINES)
      .filter(function (row) { return String(row.enabled || '').toLowerCase() === 'true'; })
      .map(function (row) {
        return {
          id: String(row.id || '').trim(),
          name: String(row.name || '').trim(),
          enabled: true,
          sortOrder: Number(row.sort_order || 0)
        };
      })
      .filter(function (machine) { return machine.id && machine.name; })
      .sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  }

  function activeReservations() {
    return LaundrySheets.readObjects(LAUNDRY.SHEETS.RESERVATIONS)
      .filter(function (row) { return String(row.status || '').toLowerCase() === 'active'; });
  }

  function makeReservationId(user, request) {
    return [
      request.date,
      request.start_time,
      request.machine_id,
      user.email,
      Date.now()
    ].join('_').replace(/[^a-zA-Z0-9_]/g, '');
  }

  function normalizeRequest(request) {
    if (!request) throw new Error('Request is required');
    return {
      date: String(request.date || '').trim(),
      start_time: String(request.startTime || request.start_time || '').trim(),
      machine_id: String(request.machineId || request.machine_id || '').trim()
    };
  }

  function getWeekSchedule(weekStartIso) {
    var config = LaundryConfig.getConfig();
    var user = LaundryUsers.resolveCurrentUser(config);
    var weekStart = weekStartIso || config.weekStart;
    var startDate = parseIsoDate(weekStart);
    var machines = enabledMachines();
    var machineIds = machines.map(function (machine) { return machine.id; });
    var days = [];
    for (var day = 0; day < 7; day += 1) {
      var date = isoDate(addDays(startDate, day));
      days.push({ date: date, label: date });
    }

    var reservations = activeReservations().filter(function (reservation) {
      reservation.date = normalizeStoredDate(reservation.date, config.timezone);
      reservation.start_time = normalizeStoredTime(reservation.start_time, config.timezone);
      return days.some(function (day) { return day.date === reservation.date; });
    });

    var reservationsBySlot = {};
    reservations.forEach(function (reservation) {
      reservationsBySlot[[reservation.date, reservation.start_time, reservation.machine_id].join('|')] = reservation;
    });

    var slots = [];
    slotTimes(config).forEach(function (time) {
      days.forEach(function (day) {
        machines.forEach(function (machine) {
          var key = [day.date, time.startTime, machine.id].join('|');
          var reservation = reservationsBySlot[key];
          var status = 'free';
          var reservationId = '';
          var occupantLabel = '';
          if (reservation) {
            reservationId = String(reservation.id || '');
            status = String(reservation.email || '').toLowerCase() === user.email ? 'mine' : 'occupied';
            occupantLabel = status === 'mine'
              ? 'Вы'
              : [reservation.display_name, reservation.room].filter(Boolean).join(', ');
          }
          slots.push({
            id: key,
            date: day.date,
            startTime: time.startTime,
            endTime: time.endTime,
            machineId: machine.id,
            status: status,
            reservationId: reservationId,
            occupantLabel: occupantLabel
          });
        });
      });
    });

    return {
      weekStart: weekStart,
      timezone: config.timezone,
      currentUser: {
        email: user.email,
        displayName: user.displayName,
        room: user.room,
        role: user.role
      },
      environment: config.appEnv,
      machines: machines,
      days: days,
      slots: slots,
      scheduleVersion: config.scheduleVersion
    };
  }

  function getReservationsProbe(weekStartIso) {
    var config = LaundryConfig.getConfig();
    var weekStart = weekStartIso || config.weekStart;
    var startDate = parseIsoDate(weekStart);
    var dates = [];
    for (var day = 0; day < 7; day += 1) {
      dates.push(isoDate(addDays(startDate, day)));
    }
    var machines = enabledMachines();
    var machineIds = machines.map(function (machine) { return machine.id; });
    var allowedTimes = slotTimes(config).map(function (slot) { return slot.startTime; });

    return {
      spreadsheetName: LaundrySheets.getSpreadsheet().getName(),
      weekStart: weekStart,
      timezone: config.timezone,
      machineIds: machineIds,
      allowedTimes: allowedTimes,
      rows: activeReservations().slice(-10).map(function (reservation) {
        var normalizedDate = normalizeStoredDate(reservation.date, config.timezone);
        var normalizedTime = normalizeStoredTime(reservation.start_time, config.timezone);
        var machineId = String(reservation.machine_id || '').trim();
        return {
          id: String(reservation.id || ''),
          rawDateType: Object.prototype.toString.call(reservation.date),
          rawDate: String(reservation.date || ''),
          normalizedDate: normalizedDate,
          rawStartTimeType: Object.prototype.toString.call(reservation.start_time),
          rawStartTime: String(reservation.start_time || ''),
          normalizedStartTime: normalizedTime,
          machineId: machineId,
          status: String(reservation.status || ''),
          matchesWeek: dates.indexOf(normalizedDate) !== -1,
          matchesTime: allowedTimes.indexOf(normalizedTime) !== -1,
          matchesMachine: machineIds.indexOf(machineId) !== -1,
          slotKey: [normalizedDate, normalizedTime, machineId].join('|')
        };
      })
    };
  }

  function reserveSlot(request) {
    var normalized = normalizeRequest(request);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      throw new Error('Service is busy. Try again in a few seconds.');
    }

    try {
      var config = LaundryConfig.getConfig();
      var user = LaundryUsers.resolveCurrentUser(config);
      var machines = enabledMachines();
      var machineAllowed = machines.some(function (machine) { return machine.id === normalized.machine_id; });
      if (!machineAllowed) throw new Error('Machine is disabled or unknown: ' + normalized.machine_id);

      var validTime = slotTimes(config).some(function (slot) { return slot.startTime === normalized.start_time; });
      if (!validTime) throw new Error('Slot time is not allowed: ' + normalized.start_time);

      var active = activeReservations();
      var conflict = active.some(function (reservation) {
        return normalizeStoredDate(reservation.date, config.timezone) === normalized.date
          && normalizeStoredTime(reservation.start_time, config.timezone) === normalized.start_time
          && String(reservation.machine_id) === normalized.machine_id;
      });
      if (conflict) {
        LaundryAuditLog.record('conflict', 'reservation', '', normalized);
        throw new Error('Slot is already occupied');
      }

      var futureByUser = active.filter(function (reservation) {
        return String(reservation.email || '').toLowerCase() === user.email;
      });
      if (futureByUser.length >= config.maxActiveReservationsPerUser) {
        throw new Error('Active reservation limit exceeded');
      }

      var now = new Date();
      var id = makeReservationId(user, normalized);
      var row = {
        id: id,
        date: normalized.date,
        start_time: normalized.start_time,
        end_time: addMinutes(normalized.start_time, config.slotDurationMinutes),
        machine_id: normalized.machine_id,
        email: user.email,
        display_name: user.displayName,
        room: user.room,
        status: 'active',
        created_at: now,
        updated_at: now,
        cancelled_at: '',
        note: ''
      };
      LaundrySheets.appendObject(LAUNDRY.SHEETS.RESERVATIONS, LAUNDRY.HEADERS.Reservations, row);
      LaundryAuditLog.record('reserve', 'reservation', id, normalized);
      return getWeekSchedule(request.weekStart || config.weekStart);
    } finally {
      lock.releaseLock();
    }
  }

  function cancelReservation(reservationId, weekStartIso) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      throw new Error('Service is busy. Try again in a few seconds.');
    }

    try {
      var config = LaundryConfig.getConfig();
      var user = LaundryUsers.resolveCurrentUser(config);
      var reservations = activeReservations();
      var reservation = reservations.find(function (row) {
        return String(row.id) === String(reservationId);
      });
      if (!reservation) throw new Error('Reservation not found');
      if (String(reservation.email || '').toLowerCase() !== user.email && user.role !== 'admin') {
        throw new Error('Cannot cancel another user reservation');
      }

      var now = new Date();
      LaundrySheets.updateObjectById(LAUNDRY.SHEETS.RESERVATIONS, reservationId, {
        status: 'cancelled',
        updated_at: now,
        cancelled_at: now
      });
      LaundryAuditLog.record('cancel', 'reservation', reservationId, {});
      return getWeekSchedule(weekStartIso || config.weekStart);
    } finally {
      lock.releaseLock();
    }
  }

  return {
    cancelReservation: cancelReservation,
    getReservationsProbe: getReservationsProbe,
    getWeekSchedule: getWeekSchedule,
    reserveSlot: reserveSlot
  };
})();
