// Google Apps Script V8. Credentials remain in Script Properties, never in the app.
const ACCESS_TOKEN_CACHE_KEY = "fcm-poller-access-token";
const ACCESS_TOKEN_CACHE_TTL_SECONDS = 3300;
const ALERT_COPY = {
  rain1: ["Moderate Rainfall Detected", "Environmental Update", "Rainfall is increasing in the monitored area. Stay informed and watch for further updates.", "Moderate Rainfall"],
  rain2: ["Heavy Rainfall Detected", "Monitoring Warning", "Heavy rainfall conditions have been detected. Stay alert and monitor official safety advisories.", "Heavy Rainfall"],
  soil1: ["Elevated Soil Moisture", "Environmental Update", "Soil moisture is increasing in the monitored area. Stay informed and watch for further updates.", "Elevated Soil Moisture"],
  soil2: ["High Soil Moisture Detected", "Monitoring Warning", "The monitored soil is becoming highly saturated. Stay alert for additional warnings.", "High Soil Moisture"],
  tilt1: ["Possible Slope Movement", "Sensor Alert", "A change in slope position was detected. Remain cautious and follow official local advisories.", "Tilt Detected"],
  vibration1: ["Ground Vibration Detected", "Sensor Alert", "Unusual ground vibration was detected in the monitored area. Stay alert for further updates.", "Vibration Detected"],
  danger: ["DANGER — Multiple Warning Signs Detected", "Critical Alert", "Heavy rainfall, high soil moisture, and possible ground movement have been detected. Follow BDRRMC instructions and prepare to move to a safer location if advised.", "Danger"],
};

function notificationOptions_() {
  const props = PropertiesService.getScriptProperties();
  const number = (key, fallback, min) => {
    const raw = props.getProperty(key);
    const value = raw === null ? fallback : Number(raw);
    if (!Number.isFinite(value) || value < min) throw new Error(`Invalid Script Property: ${key}`);
    return value;
  };
  return {
    confirm: Math.ceil(number("confirmationReadings", 2, 1)),
    recovery: Math.ceil(number("recoveryReadings", 3, 1)),
    cooldown: number("cooldownSeconds", 600, 0) * 1000,
    maxAge: number("maxReadingAgeSeconds", 300, 1) * 1000,
    maxAttempts: Math.ceil(number("maxDeliveryAttempts", 5, 1)),
    deliveryAge: number("deliveryMaxAgeSeconds", 1800, 60) * 1000,
  };
}

function setupFreeFcmPoller() {
  // Re-running setup preserves the database state and pending deliveries.
  pollFirebaseForPushEvents();
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "pollFirebaseForPushEvents")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger("pollFirebaseForPushEvents").timeBased().everyMinutes(1).create();
}

function databaseRequest_(path, config, accessToken, method, value, headers) {
  const [name, query] = path.split("?");
  return UrlFetchApp.fetch(`${config.databaseUrl.replace(/\/+$/, "")}/${name}.json${query ? `?${query}` : ""}`, {
    method: method || "get",
    headers: Object.assign({ Authorization: `Bearer ${accessToken}` }, headers || {}),
    contentType: "application/json",
    ...(method && method !== "get" ? { payload: JSON.stringify(value) } : {}),
    muteHttpExceptions: true,
  });
}

function database_(path, config, accessToken, method, value) {
  const response = databaseRequest_(path, config, accessToken, method, value);
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error(`Realtime Database ${method || "get"} failed (${code}) at ${path.split("?")[0]}`);
  return JSON.parse(response.getContentText());
}

function fetchDatabase_(path, config, accessToken) {
  return database_(path, config, accessToken);
}

function claimLease_(config, token, now) {
  // RTDB compare-and-set also excludes a second Apps Script project using this database.
  const path = "fcmPoller/lease";
  const response = databaseRequest_(path, config, token, "get", undefined, { "X-Firebase-ETag": "true" });
  if (response.getResponseCode() !== 200) throw new Error("Unable to read poller lease");
  const lease = JSON.parse(response.getContentText());
  if (lease && lease.expiresAt > now) return false;
  const headers = response.getAllHeaders();
  const etag = headers.ETag || headers.Etag || headers.etag;
  if (!etag) throw new Error("Database did not return a lease ETag");
  // Longer than Apps Script's execution limit; terminated runs recover after expiry.
  const result = databaseRequest_(path, config, token, "put", { expiresAt: now + 10 * 60 * 1000 }, { "if-match": etag });
  if (result.getResponseCode() === 412) return false;
  if (result.getResponseCode() !== 200) throw new Error("Unable to acquire poller lease");
  return true;
}

function readingTime_(reading) {
  for (const key of ["receivedAt", "updatedAt", "timestamp"]) {
    const raw = reading[key];
    let value = typeof raw === "string" && !Number.isFinite(Number(raw)) ? Date.parse(raw) : Number(raw);
    if (value > 1700000000 && value < 10000000000) value *= 1000;
    if (Number.isFinite(value) && value > 1700000000000) return value;
  }
  return 0; // Never manufacture timestamps for missing/uptime-only readings.
}

function detection_(reading, field) {
  for (const key of [field, "detected", "value", "level", "status"]) {
    const value = reading[key];
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value === 0 || value === 1) return value;
    if (typeof value !== "string") continue;
    const text = value.trim().toUpperCase();
    if (["1", "TRUE", "YES", "DETECTED", "ACTIVE", "WARNING", "TILT DETECTED", "VIBRATION DETECTED"].includes(text)) return 1;
    if (["0", "FALSE", "NO", "NORMAL", "STABLE", "INACTIVE", "NOT DETECTED", "NO TILT", "NO VIBRATION"].includes(text)) return 0;
  }
  return null;
}

function classify_(kind, reading) {
  if (kind === "tilt" || kind === "vibration") return detection_(reading, `${kind}Detected`);
  const raw = reading[kind === "rain" ? "rawValue" : "moisturePercent"];
  if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > (kind === "rain" ? 1023 : 100)) return null;
  return kind === "rain" ? (value >= 801 ? 2 : value >= 601 ? 1 : 0) : (value >= 80 ? 2 : value >= 60 ? 1 : 0);
}

function sensorReadings_(sensors, now, options) {
  // These are the same four monitored devices used by the resident dashboard.
  // An explicit mapping avoids combining unrelated slopes into a Danger event.
  const ids = { rain: "slope-01", soil: "soilSensor", tilt: "tiltSensor", vibration: "vibrationSensor" };
  const result = {};
  Object.entries(ids).forEach(([kind, id]) => {
    const reading = sensors[id] && sensors[id].latest;
    if (!reading) return;
    const time = readingTime_(reading);
    const level = classify_(kind, reading);
    if (level === null || !time || now - time > options.maxAge || time > now + 60000) return;
    result[kind] = { level, time, id: String(reading.readingId || reading.id || time) };
  });
  return result;
}

function tracker_(reading, baseline) {
  return { lastTime: reading.time, lastId: reading.id, candidate: reading.level, count: baseline ? 0 : 1,
    peak: baseline ? reading.level : 0, recovery: 0, lastNotifiedAt: 0, lastNotifiedClassification: "" };
}

function evaluate_(state, sensors, now, options, baseline) {
  const readings = sensorReadings_(sensors, now, options);
  state.trackers = state.trackers || {};
  state.overall = state.overall || { active: false, recovery: 0, signature: "", lastNotifiedAt: 0 };
  const candidates = [];
  const fresh = {};
  Object.entries(readings).forEach(([kind, reading]) => {
    let tracker = state.trackers[kind];
    if (tracker && (reading.time < tracker.lastTime || (reading.time > tracker.lastTime && reading.id === tracker.lastId))) {
      delete readings[kind];
      return;
    }
    if (!tracker) {
      tracker = state.trackers[kind] = tracker_(reading, baseline);
      fresh[kind] = !baseline;
    } else {
      if (reading.time <= tracker.lastTime || reading.id === tracker.lastId) return;
      fresh[kind] = true;
      const continuous = reading.time - tracker.lastTime <= options.maxAge;
      tracker.count = continuous && tracker.candidate === reading.level ? tracker.count + 1 : 1;
      tracker.recovery = continuous ? tracker.recovery : 0;
      tracker.candidate = reading.level;
      tracker.lastTime = reading.time;
      tracker.lastId = reading.id;
    }
    if (baseline) return;
    tracker.recovery = reading.level === 0 ? tracker.recovery + 1 : 0;
    if (tracker.recovery >= options.recovery) tracker.peak = 0;
    if (reading.level > tracker.peak && tracker.count >= options.confirm &&
        (!tracker.lastNotifiedAt || now - tracker.lastNotifiedAt >= options.cooldown)) candidates.push(kind);
  });
  // Missing/stale input breaks consecutive confirmation, but never rearms an alert.
  Object.keys(state.trackers).forEach((kind) => {
    if (!readings[kind]) { state.trackers[kind].count = 0; state.trackers[kind].recovery = 0; }
  });
  const danger = readings.rain?.level === 2 && readings.soil?.level === 2 &&
    (readings.tilt?.level === 1 || readings.vibration?.level === 1);
  const definitelySafe = readings.rain?.level < 2 || readings.soil?.level < 2 ||
    (readings.tilt?.level === 0 && readings.vibration?.level === 0);
  const overall = state.overall;
  if (overall.lastObservationAt && now - overall.lastObservationAt > options.maxAge) overall.recovery = 0;
  if (Object.keys(fresh).length) overall.lastObservationAt = now;
  const signature = Object.entries(readings).map(([key, value]) => `${key}:${value.id}`).join("|");
  if (baseline) { overall.active = Boolean(danger); overall.signature = signature; return []; }
  if (danger) {
    overall.recovery = 0;
    // Consume simultaneous individual transitions even during an already active Danger episode.
    Object.entries(readings).forEach(([kind, reading]) => {
      state.trackers[kind].peak = Math.max(state.trackers[kind].peak, reading.level);
    });
    if (!overall.active && Object.keys(fresh).length) {
      overall.active = true;
      overall.lastNotifiedAt = now;
      overall.lastNotifiedClassification = "Danger";
      return ["danger"];
    }
    return [];
  }
  // A recovery observation must include a new reading that proves Danger has cleared.
  const newSafe = (fresh.rain && readings.rain.level < 2) || (fresh.soil && readings.soil.level < 2) ||
    (fresh.tilt && fresh.vibration && readings.tilt.level === 0 && readings.vibration.level === 0);
  if (definitelySafe && newSafe && signature !== overall.signature) overall.recovery += 1;
  else if (!definitelySafe) overall.recovery = 0;
  overall.signature = signature;
  if (overall.recovery >= options.recovery) overall.active = false;
  if (overall.active) return [];
  return candidates.map((kind) => {
    const tracker = state.trackers[kind];
    tracker.peak = readings[kind].level;
    tracker.lastNotifiedAt = now;
    tracker.lastNotifiedClassification = ALERT_COPY[kind + tracker.peak][3];
    return kind + tracker.peak;
  });
}

function event_(id, key, now) {
  const [title, category, body, classification] = ALERT_COPY[key];
  return { id, type: "sensor", title, category: `SlopeSense · ${category}`, body, classification,
    severity: key === "danger" ? "danger" : category === "Environmental Update" ? "info" : "warning",
    timestamp: now, status: "pending", channelId: "rainfall-alerts" };
}

function getLatestKey_(records) { return Object.keys(records).sort().pop() || ""; }

function getRegisteredTokens_(config, token) {
  const users = fetchDatabase_("users?shallow=true", config, token) || {};
  const records = {};
  Object.keys(users).forEach((uid) => {
    const userTokens = fetchDatabase_(`users/${uid}/fcmTokens`, config, token) || {};
    Object.entries(userTokens).forEach(([key, record]) => {
      const raw = typeof record === "string" ? record : record && record.token;
      const value = typeof raw === "string" ? raw.trim() : raw;
      if (typeof value !== "string" || !value.trim() || (record.platform && record.platform !== "android")) return;
      const hash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)).replace(/=+$/, "");
      if (!records[hash]) records[hash] = { token: value, paths: [], status: "pending", attempts: 0, nextAttemptAt: 0 };
      records[hash].paths.push(`users/${uid}/fcmTokens/${key}`);
    });
  });
  return records;
}

function pollFirebaseForPushEvents() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  let config, token, leased = false;
  try {
    config = getConfig_(); token = getAccessToken_(config);
    const started = Date.now();
    if (!(leased = claimLease_(config, token, started))) return;
    const options = notificationOptions_();
    const state = fetchDatabase_("fcmPoller/state", config, token) || { version: 2, announcementCursor: "" };
    const announcements = fetchDatabase_("announcements", config, token) || {};
    const sensors = fetchDatabase_("sensors", config, token) || {};
    const baseline = !state.initialized;
    const keys = evaluate_(state, sensors, started, options, baseline);
    const events = keys.map((key) => event_(Utilities.getUuid(), key, started));
    if (!baseline) Object.entries(announcements).sort(([a], [b]) => a.localeCompare(b)).forEach(([id, item]) => {
      if (id <= state.announcementCursor || !item || typeof item !== "object") return;
      events.push({ id: `announcement-${id}`, type: "announcement", title: firstText_(item, ["title", "subject", "name"]) || "Announcement",
        body: firstText_(item, ["message", "body", "content", "description"]) || "A new announcement is available.",
        category: "SlopeSense · Announcement", classification: "Announcement", severity: "info", timestamp: started,
        status: "pending", channelId: "announcements", announcementId: id });
    });
    state.initialized = true;
    state.announcementCursor = [state.announcementCursor, getLatestKey_(announcements)].sort().pop();
    const updates = { "fcmPoller/state": state };
    const recipients = events.length ? getRegisteredTokens_(config, token) : {};
    events.forEach((event) => {
      updates[`fcmPoller/outbox/${event.id}`] = { event, recipients, createdAt: started };
      if (event.type === "sensor") updates[`notificationEvents/${event.id}`] = event;
    });
    // One atomic write: a crash cannot advance classifications without storing their events.
    database_("", config, token, "patch", updates);
    deliverPending_(config, token, options, started, Boolean(state.overall.active));
  } finally {
    try { if (leased) database_("fcmPoller/lease", config, token, "put", null); }
    finally { lock.releaseLock(); }
  }
}

function sendToToken_(token, config, accessToken, event) {
  return UrlFetchApp.fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/messages:send`, {
    method: "post", contentType: "application/json", headers: { Authorization: `Bearer ${accessToken}` },
    payload: JSON.stringify({ message: {
      token, notification: { title: event.title, body: event.body },
      data: { type: event.type, eventId: event.id, announcementId: event.announcementId || "", route: "/alerts-announcements",
        title: event.title, body: event.body, category: event.category, classification: event.classification,
        severity: event.severity, timestamp: String(event.timestamp) },
      android: { priority: "HIGH", ttl: "1800s", notification: {
        channel_id: event.channelId, sound: "default", tag: event.id, icon: "ic_launcher_monochrome",
        color: event.severity === "danger" ? "#E92525" : "#087A40", event_time: new Date(event.timestamp).toISOString(),
      } },
    } }), muteHttpExceptions: true,
  });
}

function deliverPending_(config, token, options, started, dangerActive) {
  const outbox = fetchDatabase_("fcmPoller/outbox", config, token) || {};
  const jobs = Object.entries(outbox).sort(([, a], [, b]) =>
    Number(b.event.severity === "danger") - Number(a.event.severity === "danger") || a.createdAt - b.createdAt);
  for (const [id, job] of jobs) {
    const base = `fcmPoller/outbox/${id}`;
    for (const [hash, recipient] of Object.entries(job.recipients || {})) {
      if (Date.now() - started > 240000) return; // Resume on next minute, before Apps Script times out.
      const path = `${base}/recipients/${hash}`;
      if (recipient.status === "sending") {
        // FCM has no idempotency key: don't resend an ambiguous in-flight request after a crash.
        recipient.status = "unknown";
        database_(path, config, token, "put", recipient);
      }
      if (!["pending", "retry"].includes(recipient.status)) continue;
      if (dangerActive && job.event.type === "sensor" && job.event.severity !== "danger") {
        recipient.status = "superseded";
        database_(path, config, token, "put", recipient); continue;
      }
      if (Date.now() - job.createdAt > options.deliveryAge) {
        recipient.status = "expired";
        database_(path, config, token, "put", recipient); continue;
      }
      if (recipient.nextAttemptAt > Date.now()) continue;
      // Respect logout/token rotation between queuing and retrying.
      const registered = recipient.paths.some((path) => {
        const value = fetchDatabase_(path, config, token);
        return (typeof value === "string" ? value : value?.token) === recipient.token;
      });
      if (!registered) { recipient.status = "unregistered"; database_(path, config, token, "put", recipient); continue; }
      recipient.status = "sending"; recipient.attempts += 1; recipient.attemptedAt = Date.now();
      database_(path, config, token, "put", recipient);
      let response;
      try { response = sendToToken_(recipient.token, config, token, job.event); }
      catch (_) { recipient.status = "unknown"; }
      if (response) {
        const code = response.getResponseCode();
        let payload = {};
        try { payload = JSON.parse(response.getContentText()); } catch (_) { /* malformed response remains ambiguous */ }
        const fcmError = (payload.error?.details || []).find((detail) => String(detail["@type"]).endsWith("google.firebase.fcm.v1.FcmError"))?.errorCode;
        recipient.code = code;
        if (code >= 200 && code < 300) recipient.status = "accepted";
        else if (fcmError === "UNREGISTERED" || (fcmError === "INVALID_ARGUMENT" &&
          /registration token.*not.*valid|invalid.*registration token/i.test(payload.error?.message || ""))) {
          recipient.status = "invalid";
          // Compare-and-delete prevents removing a token refreshed during delivery.
          recipient.paths.forEach((tokenPath) => removeInvalidToken_(tokenPath, recipient.token, config, token));
        } else if ([401, 429, 500, 502, 503, 504].includes(code) && recipient.attempts < options.maxAttempts) {
          if (code === 401) CacheService.getScriptCache().remove(ACCESS_TOKEN_CACHE_KEY);
          const headers = response.getAllHeaders();
          const retryAfter = headers["Retry-After"] || headers["retry-after"];
          const retryMs = Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now()) || 0;
          recipient.nextAttemptAt = Date.now() + Math.max(retryMs, 60000 * Math.pow(2, recipient.attempts - 1)) + Math.floor(Math.random() * 10000);
          recipient.status = "retry";
        } else recipient.status = "failed";
      }
      // If this write fails, stored 'sending' becomes 'unknown' next run, never a duplicate retry.
      database_(path, config, token, "put", recipient);
    }
    const statuses = Object.values(job.recipients || {}).map((recipient) => recipient.status);
    const pending = statuses.some((status) => ["pending", "retry"].includes(status));
    const summary = { status: pending ? "pending" : !statuses.length ? "no-recipients" :
      statuses.every((status) => status === "accepted") ? "accepted" : statuses.includes("unknown") ? "unknown" : "partial-or-failed",
      updatedAt: Date.now(), accepted: statuses.filter((status) => status === "accepted").length, total: statuses.length };
    const updates = {};
    if (job.event.type === "sensor") updates[`notificationEvents/${id}/delivery`] = summary;
    if (job.event.type === "sensor") updates[`notificationEvents/${id}/status`] = summary.status;
    if (!pending) {
      // Keep audit status/attempts without retaining obsolete plaintext device tokens.
      updates[`fcmPoller/deliveries/${id}`] = { event: job.event, summary,
        recipients: Object.fromEntries(Object.entries(job.recipients || {}).map(([hash, value]) => [hash, {
          status: value.status, attempts: value.attempts, attemptedAt: value.attemptedAt || 0, code: value.code || 0,
        }])) };
      updates[base] = null;
    }
    database_("", config, token, "patch", updates);
  }
}

function removeInvalidToken_(path, invalidToken, config, token) {
  const response = databaseRequest_(path, config, token, "get", undefined, { "X-Firebase-ETag": "true" });
  if (response.getResponseCode() !== 200) throw new Error("Unable to check invalid token");
  const value = JSON.parse(response.getContentText());
  if ((typeof value === "string" ? value : value?.token) !== invalidToken) return;
  const headers = response.getAllHeaders();
  const result = databaseRequest_(path, config, token, "put", null, { "if-match": headers.ETag || headers.Etag || headers.etag });
  if (![200, 412].includes(result.getResponseCode())) throw new Error("Unable to remove invalid token");
}

function firstText_(record, keys) {
  for (const key of keys) if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  return "";
}
function getConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const config = {
    projectId: properties.getProperty("projectId"),
    clientEmail: properties.getProperty("clientEmail"),
    privateKey: (properties.getProperty("privateKey") || "").replace(/\\n/g, "\n"),
    databaseUrl: properties.getProperty("databaseUrl"),
  };
  const missing = Object.keys(config).filter((key) => !config[key]);
  if (missing.length) throw new Error(`Set these Script Properties first: ${missing.join(", ")}`);
  return config;
}

function getAccessToken_(config) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(ACCESS_TOKEN_CACHE_KEY);
  if (cached) return cached;

  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Utilities.base64EncodeWebSafe(value).replace(/=+$/, "");
  const header = encode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = encode(JSON.stringify({
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsignedJwt = `${header}.${claims}`;
  const signature = Utilities.computeRsaSignature(
    Utilities.RsaAlgorithm.RSA_SHA_256,
    unsignedJwt,
    config.privateKey,
  );
  const assertion = `${unsignedJwt}.${Utilities.base64EncodeWebSafe(signature).replace(/=+$/, "")}`;
  const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    payload: {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    },
    muteHttpExceptions: true,
  });
  const result = JSON.parse(response.getContentText());
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || !result.access_token) {
    throw new Error(`Google OAuth failed (${response.getResponseCode()}): ${response.getContentText()}`);
  }
  cache.put(ACCESS_TOKEN_CACHE_KEY, result.access_token, ACCESS_TOKEN_CACHE_TTL_SECONDS);
  return result.access_token;
}
