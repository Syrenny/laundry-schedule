var LaundryUsers = (function () {
  var USERS_CACHE_SECONDS = 60;

  function usersCacheKey() {
    var props = PropertiesService.getScriptProperties();
    return 'laundry_users_v1_' + (props.getProperty('APP_ENV') || 'staging');
  }

  function readCachedUsers() {
    if (typeof CacheService === 'undefined') return null;
    var cached = CacheService.getScriptCache().get(usersCacheKey());
    return cached ? JSON.parse(cached) : null;
  }

  function writeCachedUsers(users) {
    if (typeof CacheService === 'undefined') return;
    CacheService.getScriptCache().put(usersCacheKey(), JSON.stringify(users), USERS_CACHE_SECONDS);
  }

  function getCurrentUserEmail() {
    return Session.getActiveUser().getEmail() || '';
  }

  function getCurrentUserProbe() {
    return {
      activeUserEmail: Session.getActiveUser().getEmail() || '',
      effectiveUserEmail: Session.getEffectiveUser().getEmail() || '',
      temporaryActiveUserKey: Session.getTemporaryActiveUserKey() || '',
      appEnv: (PropertiesService.getScriptProperties().getProperty('APP_ENV') || 'staging')
    };
  }

  function getUsersByEmail() {
    var cached = readCachedUsers();
    if (cached) return cached;

    var users = {};
    LaundrySheets.readObjects(LAUNDRY.SHEETS.USERS).forEach(function (row) {
      var email = String(row.email || '').trim().toLowerCase();
      if (email) {
        users[email] = {
          email: email,
          displayName: String(row.display_name || '').trim(),
          room: String(row.room || '').trim(),
          role: String(row.role || 'user').trim() || 'user',
          enabled: String(row.enabled || 'TRUE').toLowerCase() !== 'false'
        };
      }
    });
    writeCachedUsers(users);
    return users;
  }

  function resolveCurrentUser(config) {
    var email = getCurrentUserEmail().toLowerCase();
    if (!email) {
      throw new Error('Email is unavailable. Open the app with an allowed Google account.');
    }

    var users = getUsersByEmail();
    var user = users[email] || {
      email: email,
      displayName: '',
      room: '',
      role: 'user',
      enabled: !config.requireUserAllowlist
    };

    if (!user.enabled) {
      throw new Error('User is disabled or not in allowlist: ' + email);
    }
    return user;
  }

  function assertAdmin(email) {
    var users = getUsersByEmail();
    var user = users[String(email || '').toLowerCase()];
    if (!user || user.role !== 'admin' || !user.enabled) {
      throw new Error('Admin access required');
    }
  }

  return {
    assertAdmin: assertAdmin,
    getCurrentUserEmail: getCurrentUserEmail,
    getCurrentUserProbe: getCurrentUserProbe,
    resolveCurrentUser: resolveCurrentUser
  };
})();
