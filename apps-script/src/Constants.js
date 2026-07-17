var LAUNDRY = {
  SHEETS: {
    SETTINGS: 'Settings',
    MACHINES: 'Machines',
    USERS: 'Users',
    RESERVATIONS: 'Reservations',
    AUDIT_LOG: 'AuditLog',
    ERROR_LOG: 'ErrorLog'
  },
  HEADERS: {
    Settings: ['key', 'value', 'description'],
    Machines: ['id', 'name', 'enabled', 'sort_order', 'note'],
    Users: ['email', 'display_name', 'room', 'role', 'enabled', 'note'],
    Reservations: [
      'id',
      'date',
      'start_time',
      'end_time',
      'machine_id',
      'email',
      'display_name',
      'room',
      'status',
      'created_at',
      'updated_at',
      'cancelled_at',
      'note'
    ],
    AuditLog: ['timestamp', 'actor_email', 'action', 'entity_type', 'entity_id', 'details_json'],
    ErrorLog: ['timestamp', 'severity', 'context', 'actor_email', 'message', 'stack', 'details_json', 'telegram_status']
  },
  SETTINGS_DEFAULTS: [
    ['week_start', '2026-07-20', 'Понедельник текущей недели по умолчанию'],
    ['slot_start_hour', '5', 'Первый час расписания'],
    ['slot_count', '24', 'Количество часовых слотов'],
    ['slot_duration_minutes', '60', 'Длительность одного слота'],
    ['max_active_reservations_per_user', '1', 'Максимум активных будущих записей на пользователя'],
    ['allow_cancel_before_minutes', '0', 'За сколько минут до начала можно отменять запись'],
    ['schedule_version', '1', 'Версия расписания для обновления UI'],
    ['app_status', 'active', 'active или maintenance'],
    ['app_env', 'staging', 'staging или production; в local используется только frontend mock'],
    ['telegram_notifications_enabled', 'TRUE', 'Включать Telegram-уведомления о критичных ошибках'],
    ['telegram_min_severity', 'error', 'Минимальный уровень ошибок для отправки в Telegram'],
    ['require_user_allowlist', 'FALSE', 'Разрешать запись только пользователям из Users']
  ],
  MACHINES_DEFAULTS: [
    ['haier_1', 'Haier 1', 'TRUE', '1', ''],
    ['haier_2', 'Haier 2', 'TRUE', '2', ''],
    ['haier_3', 'Haier 3', 'TRUE', '3', ''],
    ['haier_4', 'Haier 4', 'TRUE', '4', ''],
    ['haier_5', 'Haier 5', 'FALSE', '5', 'Машинка не по записи']
  ],
  SEVERITY_ORDER: {
    info: 10,
    warning: 20,
    error: 30,
    critical: 40
  }
};
