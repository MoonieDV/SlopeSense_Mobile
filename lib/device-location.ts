import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

type LocationModule = typeof import("expo-location");

const PHOTON_API_URL = "https://photon.komoot.io";
const CEBU_CITY_CENTER = { latitude: 10.3157, longitude: 123.8854 };
const CEBU_CITY_BOUNDS = "123.10,9.40,124.15,11.40";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    osm_value?: string;
  };
};

type PhotonResponse = { features?: PhotonFeature[] };

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

function formatGeocodedPlace(
  place: Awaited<ReturnType<LocationModule["reverseGeocodeAsync"]>>[number],
  fallback: string,
) {
  const street = [place?.streetNumber, place?.street].filter(Boolean).join(" ");
  const parts = [street, place?.district, place?.city, place?.subregion, place?.region, place?.country].filter(
    (part, index, values): part is string => Boolean(part) && values.indexOf(part) === index,
  );
  return parts.length > 0 ? parts.join(", ") : fallback;
}

function isWithinPhilippines(latitude: number, longitude: number) {
  return latitude >= 4.3 && latitude <= 21.3 && longitude >= 116 && longitude <= 127;
}

function isWithinVisayas(latitude: number, longitude: number) {
  return latitude >= 9 && latitude <= 13.2 && longitude >= 121 && longitude <= 126.8;
}

function formatPhotonFeature(feature: PhotonFeature) {
  const properties = feature.properties ?? {};
  const street = [properties.housenumber, properties.street].filter(Boolean).join(" ");
  const parts = [
    properties.name !== properties.street ? properties.name : undefined,
    street,
    properties.district,
    properties.city,
    properties.county,
    properties.state,
    properties.country,
  ].filter((part, index, values): part is string => Boolean(part) && values.indexOf(part) === index);
  return parts.join(", ");
}

async function fetchPhoton(path: string): Promise<PhotonResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(`${PHOTON_API_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Photon request failed with ${response.status}`);
    return (await response.json()) as PhotonResponse;
  } finally {
    clearTimeout(timeout);
  }
}

function photonFeatureToLocation(feature: PhotonFeature): DeviceLocation | null {
  const [longitude, latitude] = feature.geometry?.coordinates ?? [];
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (feature.properties?.countrycode?.toUpperCase() !== "PH" && !isWithinPhilippines(latitude, longitude)) return null;

  const label = formatPhotonFeature(feature);
  if (!label) return null;
  return { latitude, longitude, label };
}

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

  let permissions = await Location.getForegroundPermissionsAsync();
  if (permissions.status !== "granted") {
    permissions = await Location.requestForegroundPermissionsAsync();
  }
  if (permissions.status !== "granted") return null;

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const { latitude, longitude } = position.coords;

  let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  try {
    const photon = await fetchPhoton(
      `/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&lang=en&limit=1`,
    );
    const photonLocation = photon.features?.[0] ? photonFeatureToLocation(photon.features[0]) : null;
    if (photonLocation) label = photonLocation.label;
  } catch {
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (places[0]) label = formatGeocodedPlace(places[0], label);
    } catch {
      // Coordinates remain a useful fallback when reverse geocoding is unavailable.
    }
  }

  return { latitude, longitude, label };
}

export async function searchLocationSuggestions(query: string): Promise<DeviceLocation[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3) return [];

  try {
    const photon = await fetchPhoton(
      `/api?q=${encodeURIComponent(normalizedQuery)}&limit=12&lang=en&countrycode=PH&bbox=${CEBU_CITY_BOUNDS}&lat=${CEBU_CITY_CENTER.latitude}&lon=${CEBU_CITY_CENTER.longitude}&zoom=11&location_bias_scale=0.05`,
    );
    const features = photon.features ?? [];
    const cebuCityFeatures = features.filter((feature) => {
      const city = feature.properties?.city?.trim().toLowerCase();
      const name = feature.properties?.name?.trim().toLowerCase();
      return city === "cebu city" || name === "cebu city";
    });
    const focusedFeatures = cebuCityFeatures.length > 0 ? cebuCityFeatures : features;
    const normalizedSearch = normalizedQuery.toLowerCase();
    const photonSuggestions = focusedFeatures
      .sort((first, second) => {
        const score = (feature: PhotonFeature) => {
          const name = feature.properties?.name?.toLowerCase() ?? "";
          const exactName = name === normalizedSearch ? 100 : 0;
          const startsWithName = name.startsWith(normalizedSearch) ? 40 : 0;
          const administrativePlace = ["suburb", "village", "neighbourhood", "town", "city"].includes(feature.properties?.osm_value ?? "") ? 20 : 0;
          return exactName + startsWithName + administrativePlace;
        };
        return score(second) - score(first);
      })
      .map(photonFeatureToLocation)
      .filter((suggestion): suggestion is DeviceLocation => suggestion !== null)
      .filter((suggestion, index, values) => values.findIndex(({ label }) => label === suggestion.label) === index)
      .slice(0, 5);
    if (photonSuggestions.length > 0) return photonSuggestions;
  } catch {
    // Fall through to the device geocoder when the free service is unavailable.
  }

  if (Platform.OS === "web") return [];

  const Location = getLocationModule();
  if (!Location) return [];

  let permissions = await Location.getForegroundPermissionsAsync();
  if (permissions.status !== "granted") {
    permissions = await Location.requestForegroundPermissionsAsync();
  }
  if (permissions.status !== "granted") return [];

  const hasPhilippineContext = /philippines|visayas/i.test(normalizedQuery);
  const searchQueries = hasPhilippineContext
    ? [normalizedQuery]
    : [`${normalizedQuery}, Visayas, Philippines`, `${normalizedQuery}, Philippines`];
  const coordinateGroups = await Promise.all(searchQueries.map((searchQuery) => Location.geocodeAsync(searchQuery)));
  const coordinates = coordinateGroups
    .flatMap((group) => group.slice(0, 5))
    .filter(
      (coordinate, index, values) =>
        values.findIndex(
          (candidate) =>
            candidate.latitude.toFixed(4) === coordinate.latitude.toFixed(4) &&
            candidate.longitude.toFixed(4) === coordinate.longitude.toFixed(4),
        ) === index,
    )
    .slice(0, 8);

  const queryWords = normalizedQuery.toLowerCase().split(/\s+/).filter((word) => word.length >= 2);
  const rankedSuggestions = await Promise.all(
    coordinates.map(async ({ latitude, longitude }) => {
      const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = places[0];
        if (!place) return null;

        const isPhilippineResult =
          place.isoCountryCode?.toUpperCase() === "PH" ||
          place.country?.toLowerCase().includes("philippines") ||
          isWithinPhilippines(latitude, longitude);
        if (!isPhilippineResult) return null;

        const label = formatGeocodedPlace(place, fallback);
        const normalizedLabel = label.toLowerCase();
        const matchingWords = queryWords.filter((word) => normalizedLabel.includes(word)).length;
        const score = (isWithinVisayas(latitude, longitude) ? 100 : 0) + matchingWords * 10;
        return { latitude, longitude, label, score };
      } catch {
        if (!isWithinPhilippines(latitude, longitude)) return null;
        return { latitude, longitude, label: fallback, score: isWithinVisayas(latitude, longitude) ? 100 : 0 };
      }
    }),
  );

  return rankedSuggestions
    .filter((suggestion): suggestion is DeviceLocation & { score: number } => suggestion !== null)
    .sort((first, second) => second.score - first.score)
    .filter((suggestion, index, values) => values.findIndex(({ label }) => label === suggestion.label) === index)
    .slice(0, 5)
    .map(({ latitude, longitude, label }) => ({ latitude, longitude, label }));
}
