import { onValue, ref } from "firebase/database";
import { firebaseDatabase } from "@/lib/firebase";

export const RAIN_SENSOR_DEVICE_ID = "slope-01";

export type RainSensorReading = {
  deviceId: string;
  rawValue: number;
  level: string;
  updatedAt: number;
};

const ALERT_LEVELS = ["LIGHT RAINFALL", "MODERATE RAINFALL", "HEAVY RAINFALL"] as const;

export function isRainfallAlertLevel(level: string) {
  const normalizedLevel = level.trim().toUpperCase();
  return ALERT_LEVELS.includes(normalizedLevel as (typeof ALERT_LEVELS)[number]);
}

export function getRainfallSeverity(level: string) {
  return ALERT_LEVELS.indexOf(level.trim().toUpperCase() as (typeof ALERT_LEVELS)[number]);
}

export function formatRainfallLevel(level: string) {
  return level
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function normalizeRainSensorReading(value: unknown): RainSensorReading | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Partial<RainSensorReading>;
  const rawValue = Number(data.rawValue);
  const updatedAt = Number(data.updatedAt);

  if (!Number.isFinite(rawValue) || typeof data.level !== "string") {
    return null;
  }

  return {
    deviceId: typeof data.deviceId === "string" && data.deviceId.trim() ? data.deviceId : RAIN_SENSOR_DEVICE_ID,
    rawValue,
    level: data.level,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };
}

export function subscribeToRainSensor(
  deviceId: string,
  onReading: (reading: RainSensorReading | null) => void,
  onError: (error: Error) => void,
) {
  return onValue(
    ref(firebaseDatabase, `sensors/${deviceId}/latest`),
    (snapshot) => {
      onReading(snapshot.exists() ? normalizeRainSensorReading(snapshot.val()) : null);
    },
    (error) => onError(error),
  );
}
