const ACCESS_TOKEN_CACHE_KEY = "fcm-poller-access-token";
const ACCESS_TOKEN_CACHE_TTL_SECONDS = 3300;
function setupFreeFcmPoller() {
  const config = getConfig_();
  const accessToken = getAccessToken_(config);
  const announcements = fetchDatabase_("announcements", config, accessToken) || {};
  const sensors = fetchDatabase_("sensors", config, accessToken) || {};
  const state = {
    initialized: true,
    announcementCursor: getLatestKey_(announcements),
    sensorLevels: getSensorLevels_(sensors),
  };

  PropertiesService.getScriptProperties().setProperty("pollerState", JSON.stringify(state));
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "pollFirebaseForPushEvents")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger("pollFirebaseForPushEvents").timeBased().everyMinutes(1).create();
  console.log("Poller initialized. Existing Firebase data was saved as the baseline.");
}

function pollFirebaseForPushEvents() {
  const config = getConfig_();
  const accessToken = getAccessToken_(config);
  const properties = PropertiesService.getScriptProperties();
  const previousState = JSON.parse(properties.getProperty("pollerState") || "null");
  const announcements = fetchDatabase_("announcements", config, accessToken) || {};
  const sensors = fetchDatabase_("sensors", config, accessToken) || {};

  if (!previousState || !previousState.initialized) {
    properties.setProperty("pollerState", JSON.stringify({
      initialized: true,
      announcementCursor: getLatestKey_(announcements),
      sensorLevels: getSensorLevels_(sensors),
    }));
    console.log("Poller baseline initialized; no existing records were sent.");
    return;
  }

  const tokens = getRegisteredTokens_(config, accessToken);
  const announcementCursor = previousState.announcementCursor || "";

  Object.entries(announcements).forEach(([id, announcement]) => {
    if (id <= announcementCursor || !announcement || typeof announcement !== "object") return;
    const title = firstText_(announcement, ["title", "subject", "name"]) || "Announcement";
    const body = firstText_(announcement, ["message", "body", "content", "description"]) || "A new announcement is available.";
    sendToTokens_(tokens, config, accessToken, {
      title,
      body,
      channelId: "announcements",
      data: { type: "announcement", route: "/alerts-announcements" },
    });
  });

  const previousLevels = previousState.sensorLevels || {};
  const nextLevels = getSensorLevels_(sensors);
  Object.entries(sensors).forEach(([deviceId, sensor]) => {
    const latest = sensor && sensor.latest;
    if (!latest || typeof latest !== "object" || typeof latest.level !== "string") return;
    const level = latest.level.trim();
    if (!level || previousLevels[deviceId] === level.toLowerCase()) return;

    const sensorType = String(latest.sensorType || "").toLowerCase();
    const sensorName = sensorType.includes("soil") ? "Soil moisture" : "Rainfall";
    const details = typeof latest.moisturePercent === "number"
      ? ` Moisture: ${latest.moisturePercent}%.`
      : typeof latest.rawValue === "number" ? ` Reading: ${latest.rawValue}.` : "";
    sendToTokens_(tokens, config, accessToken, {
      title: `${sensorName} update`,
      body: `${deviceId} reports ${level}.${details}`,
      channelId: "rainfall-alerts",
      data: { type: "sensor", deviceId, route: "/alerts-announcements" },
    });
  });

  properties.setProperty("pollerState", JSON.stringify({
    initialized: true,
    announcementCursor: getLatestKey_(announcements),
    sensorLevels: nextLevels,
  }));
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

function fetchDatabase_(path, config, accessToken) {
  const baseUrl = config.databaseUrl.replace(/\/+$/, "");
  const [databasePath, query] = path.split("?");
  const queryString = query ? `${query}&` : "";
  const url = `${baseUrl}/${databasePath}.json?${queryString}access_token=${encodeURIComponent(accessToken)}`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error(`Realtime Database read failed (${response.getResponseCode()}): ${response.getContentText()}`);
  }
  return JSON.parse(response.getContentText());
}

function getRegisteredTokens_(config, accessToken) {
  const userIds = fetchDatabase_("users?shallow=true", config, accessToken) || {};
  const tokens = new Set();
  Object.keys(userIds).forEach((uid) => {
    const records = fetchDatabase_(`users/${uid}/fcmTokens`, config, accessToken);
    if (!records || typeof records !== "object") return;
    Object.values(records).forEach((record) => {
      const token = typeof record === "string" ? record : record && record.token;
      if (typeof token === "string" && token.trim()) tokens.add(token.trim());
    });
  });
  return [...tokens];
}

function getLatestKey_(records) {
  return Object.keys(records).sort().pop() || "";
}

function getSensorLevels_(sensors) {
  const levels = {};
  Object.entries(sensors).forEach(([deviceId, sensor]) => {
    const level = sensor && sensor.latest && sensor.latest.level;
    if (typeof level === "string") levels[deviceId] = level.trim().toLowerCase();
  });
  return levels;
}

function sendToTokens_(tokens, config, accessToken, notification) {
  if (!tokens.length) {
    console.log("No registered Android FCM tokens; skipped notification.");
    return;
  }
  tokens.forEach((token) => {
    const response = UrlFetchApp.fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/messages:send`,
      {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: `Bearer ${accessToken}` },
        payload: JSON.stringify({
          message: {
            token,
            notification: { title: notification.title, body: notification.body },
            data: Object.fromEntries(Object.entries(notification.data).map(([key, value]) => [key, String(value)])),
            android: {
              priority: "HIGH",
              notification: { channel_id: notification.channelId, sound: "default" },
            },
          },
        }),
        muteHttpExceptions: true,
      },
    );
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
      throw new Error(`FCM send failed (${response.getResponseCode()}): ${response.getContentText()}`);
    }
  });
}

function firstText_(record, keys) {
  for (const key of keys) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  return "";
}
