const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");
const { onValueCreated, onValueWritten } = require("firebase-functions/v2/database");

initializeApp({
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ??
    "https://slopesense-ec686-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const database = getDatabase();
const messaging = getMessaging();
const REGION = "asia-southeast1";
const DATABASE_INSTANCE = "slopesense-ec686-default-rtdb";

async function sendToRegisteredDevices({ title, body, channelId, data }) {
  const usersSnapshot = await database.ref("users").get();
  const tokenRecords = new Map();

  usersSnapshot.forEach((userSnapshot) => {
    userSnapshot.child("fcmTokens").forEach((tokenSnapshot) => {
      const record = tokenSnapshot.val();
      const token = typeof record === "string" ? record : record?.token;
      if (typeof token === "string" && token) {
        tokenRecords.set(token, tokenSnapshot.ref);
      }
    });
  });

  const entries = [...tokenRecords.entries()];
  for (let offset = 0; offset < entries.length; offset += 500) {
    const batch = entries.slice(offset, offset + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map(([token]) => token),
      notification: { title, body },
      data,
      android: {
        priority: "high",
        notification: { channelId, sound: "default" },
      },
      apns: {
        payload: { aps: { sound: "default" } },
      },
    });

    const staleTokenRemovals = [];
    response.responses.forEach((result, index) => {
      const errorCode = result.error?.code;
      if (
        errorCode === "messaging/invalid-registration-token" ||
        errorCode === "messaging/registration-token-not-registered"
      ) {
        staleTokenRemovals.push(batch[index][1].remove());
      }
    });
    await Promise.all(staleTokenRemovals);
  }
}

function announcementText(announcement) {
  const title = announcement.title ?? announcement.subject ?? announcement.name ?? "Announcement";
  const body = announcement.message ?? announcement.body ?? announcement.content ?? announcement.description ?? "";
  return {
    title: String(title).trim() || "Announcement",
    body: String(body).trim() || "A new announcement is available.",
  };
}

exports.notifyForAnnouncement = onValueCreated(
  {
    ref: "/announcements/{announcementId}",
    region: REGION,
    instance: DATABASE_INSTANCE,
  },
  async (event) => {
    const announcement = event.data.val();
    if (!announcement || typeof announcement !== "object") return;

    const { title, body } = announcementText(announcement);
    await sendToRegisteredDevices({
      title,
      body,
      channelId: "announcements",
      data: { type: "announcement", route: "/alerts-announcements" },
    });
  },
);

exports.notifyForSensorLevelChange = onValueWritten(
  {
    ref: "/sensors/{deviceId}/latest",
    region: REGION,
    instance: DATABASE_INSTANCE,
  },
  async (event) => {
    const previous = event.data.before.val();
    const current = event.data.after.val();
    if (!current || typeof current !== "object") return;

    const level = String(current.level ?? "").trim();
    const previousLevel = String(previous?.level ?? "").trim();
    if (!level || level.toLowerCase() === previousLevel.toLowerCase()) return;

    const deviceId = String(current.deviceId ?? event.params.deviceId);
    const sensorType = String(current.sensorType ?? "").toLowerCase();
    const sensorName = sensorType.includes("soil") ? "Soil moisture" : "Rainfall";
    const bodyParts = [`${deviceId} reports ${level}.`];
    if (typeof current.moisturePercent === "number") {
      bodyParts.push(`Moisture: ${current.moisturePercent}%.`);
    } else if (typeof current.rawValue === "number") {
      bodyParts.push(`Reading: ${current.rawValue}.`);
    }

    await sendToRegisteredDevices({
      title: `${sensorName} update`,
      body: bodyParts.join(" "),
      channelId: "rainfall-alerts",
      data: { type: "sensor", deviceId, route: "/alerts-announcements" },
    });
  },
);