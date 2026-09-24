import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

type LocationModule = typeof import("expo-location");

function getLocationModule(): LocationModule | null {
  try {
    return require("expo-location") as LocationModule;
  } catch {
    // Older development builds may not include the native location module yet.
    return null;
  }
}

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

export async function requestPostAuthPermissions() {
  if (Platform.OS === "web") return;

  try {
    const notificationPermissions = await Notifications.getPermissionsAsync();
    if (notificationPermissions.status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
  } catch {
    // Authentication should still complete if notification access is unavailable.
  }

  try {
    const Location = getLocationModule();
    if (!Location) return;

    const locationPermissions = await Location.getForegroundPermissionsAsync();
    if (locationPermissions.status !== "granted") {
      await Location.requestForegroundPermissionsAsync();
    }
  } catch {
    // The location screens provide a retry path when access is unavailable.
  }
}

export async function getDeviceLocation(): Promise<DeviceLocation | null> {
  if (Platform.OS === "web") return null;

  const Location = getLocationModule();
  if (!Location) return null;

  const permissions = await Location.getForegroundPermissionsAsync();
  if (permissions.status !== "granted") return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { latitude, longitude } = position.coords;

  let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places[0];
    const parts = [place?.district, place?.city, place?.region].filter(Boolean);
    if (parts.length > 0) label = parts.join(", ");
  } catch {
    // Coordinates remain a useful fallback when reverse geocoding is unavailable.
  }

  return { latitude, longitude, label };
}
