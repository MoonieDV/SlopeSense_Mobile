import { describe, expect, it } from "vitest";

import { interpretResidentCondition, type SensorType } from "../lib/current-conditions";

describe("interpretResidentCondition", () => {
  it.each([
    ["rainfall", { level: "DRY" }],
    ["soilMoisture", { level: "NORMAL" }],
    ["tilt", { level: "STABLE", tiltDetected: false }],
    ["vibration", { level: "NORMAL", vibrationDetected: false }],
  ] satisfies [SensorType, Record<string, unknown>][]) ("treats %s as normal", (sensorType, reading) => {
    expect(interpretResidentCondition(sensorType, reading)).toBeNull();
  });

  it.each([
    ["LIGHT RAINFALL", "caution", "Rain Has Started"],
    ["MODERATE RAINFALL", "warning", "Rain is Getting Heavier"],
    ["HEAVY RAINFALL", "danger", "Heavy Rainfall Detected"],
  ])("maps the rainfall classification %s", (level, severity, title) => {
    expect(interpretResidentCondition("rainfall", { level })).toMatchObject({ classification: level, severity, title });
  });

  it.each([
    ["CAUTION", "caution", "Ground is Getting Wetter"],
    ["WARNING", "warning", "Ground is Very Wet"],
    ["DANGER", "danger", "Ground is Very Wet"],
  ])("maps the soil classification %s", (level, severity, title) => {
    expect(interpretResidentCondition("soilMoisture", { level })).toMatchObject({ severity, title });
  });

  it("maps detected movement and vibration without predicting a landslide", () => {
    const tilt = interpretResidentCondition("tilt", { level: "TILT DETECTED", tiltDetected: true });
    const vibration = interpretResidentCondition("vibration", { level: "VIBRATION DETECTED", vibrationDetected: true });

    expect(tilt?.title).toBe("Unusual Ground Movement Detected");
    expect(vibration?.title).toBe("Unusual Ground Vibration Detected");
    expect(`${tilt?.message} ${tilt?.advice} ${vibration?.message} ${vibration?.advice}`.toLowerCase())
      .not.toContain("landslide");
  });

  it("uses receipt time when firmware updatedAt is device uptime", () => {
    expect(interpretResidentCondition("rainfall", {
      level: "LIGHT RAINFALL",
      updatedAt: 42_000,
      receivedAt: 1_800_000_000_000,
    })?.timestamp).toBe(1_800_000_000_000);
  });
});
