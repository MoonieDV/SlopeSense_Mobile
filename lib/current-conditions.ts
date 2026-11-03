export type SensorType = "rainfall" | "soilMoisture" | "tilt" | "vibration";
export type ConditionSeverity = "caution" | "warning" | "danger";

export type SensorReading = {
  level?: unknown;
  updatedAt?: unknown;
  receivedAt?: unknown;
  tiltDetected?: unknown;
  vibrationDetected?: unknown;
  detected?: unknown;
};

export type ResidentCondition = {
  sensorType: SensorType;
  classification: string;
  title: string;
  message: string;
  advice: string;
  severity: ConditionSeverity;
  timestamp: number;
};

export const getSensorTimestamp = (reading: SensorReading) => {
  const updatedAt = Number(reading.updatedAt);
  if (Number.isFinite(updatedAt) && updatedAt > 1_700_000_000_000) return updatedAt;

  const receivedAt = Number(reading.receivedAt);
  return Number.isFinite(receivedAt) ? receivedAt : Date.now();
};

const normalizedLevel = (reading: SensorReading) =>
  typeof reading.level === "string" ? reading.level.trim().toUpperCase() : "";

const isDetected = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;

  return ["1", "TRUE", "YES", "DETECTED", "ACTIVE", "WARNING", "TILT DETECTED", "VIBRATION DETECTED"]
    .includes(value.trim().toUpperCase());
};

export function interpretResidentCondition(
  sensorType: SensorType,
  reading: SensorReading | null | undefined,
): ResidentCondition | null {
  if (!reading) return null;

  const classification = normalizedLevel(reading);
  const timestamp = getSensorTimestamp(reading);

  if (sensorType === "rainfall") {
    if (!classification || classification === "DRY") return null;

    if (classification === "HEAVY RAINFALL") {
      return {
        sensorType,
        classification,
        title: "Heavy Rainfall Detected",
        message: "Heavy rain has been detected in your area.",
        advice: "Stay alert for further updates and avoid steep slopes.",
        severity: "danger",
        timestamp,
      };
    }

    if (classification === "MODERATE RAINFALL") {
      return {
        sensorType,
        classification,
        title: "Rain is Getting Heavier",
        message: "Rainfall has increased in your area.",
        advice: "Stay aware of changing conditions.",
        severity: "warning",
        timestamp,
      };
    }

    if (classification === "LIGHT RAINFALL") {
      return {
        sensorType,
        classification,
        title: "Rain Has Started",
        message: "Light rain has been detected in your area.",
        advice: "Keep an eye on changing conditions.",
        severity: "caution",
        timestamp,
      };
    }

    return null;
  }

  if (sensorType === "soilMoisture") {
    if (!classification || classification === "NORMAL") return null;

    if (classification === "DANGER") {
      return {
        sensorType,
        classification,
        title: "Ground is Very Wet",
        message: "The ground is much wetter than usual.",
        advice: "Stay alert and be cautious around slopes.",
        severity: "danger",
        timestamp,
      };
    }

    if (classification === "WARNING") {
      return {
        sensorType,
        classification,
        title: "Ground is Very Wet",
        message: "The ground is wetter than usual.",
        advice: "Be cautious around slopes, especially if rain continues.",
        severity: "warning",
        timestamp,
      };
    }

    if (classification === "CAUTION") {
      return {
        sensorType,
        classification,
        title: "Ground is Getting Wetter",
        message: "The ground is becoming wetter than usual.",
        advice: "Stay aware if rain continues.",
        severity: "caution",
        timestamp,
      };
    }

    return null;
  }

  if (sensorType === "tilt") {
    const detected = classification === "TILT DETECTED"
      || isDetected(reading.tiltDetected)
      || isDetected(reading.detected);
    if (!detected) return null;

    return {
      sensorType,
      classification: classification || "TILT DETECTED",
      title: "Unusual Ground Movement Detected",
      message: "A change in ground position has been detected.",
      advice: "Stay alert for further updates.",
      severity: "danger",
      timestamp,
    };
  }

  const detected = classification === "VIBRATION DETECTED"
    || isDetected(reading.vibrationDetected)
    || isDetected(reading.detected);
  if (!detected) return null;

  return {
    sensorType,
    classification: classification || "VIBRATION DETECTED",
    title: "Unusual Ground Vibration Detected",
    message: "Unusual vibration has been detected in the ground.",
    advice: "Stay alert for further updates.",
    severity: "warning",
    timestamp,
  };
}
