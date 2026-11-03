import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const storageKey = (uid: string) => `slopesense:profile-photo:${uid}`;

export async function getLocalProfilePhoto(uid: string) {
  const storedUri = await AsyncStorage.getItem(storageKey(uid));
  if (!storedUri) return "";

  const file = await FileSystem.getInfoAsync(storedUri);
  if (file.exists) return storedUri;

  await AsyncStorage.removeItem(storageKey(uid));
  return "";
}

export async function saveLocalProfilePhoto(uid: string, sourceUri: string) {
  if (!FileSystem.documentDirectory) throw new Error("Local app storage is unavailable.");

  const directory = `${FileSystem.documentDirectory}profile-photos/`;
  const destination = `${directory}${uid}.jpg`;
  const directoryInfo = await FileSystem.getInfoAsync(directory);
  if (!directoryInfo.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const existingPhoto = await FileSystem.getInfoAsync(destination);
  if (existingPhoto.exists) await FileSystem.deleteAsync(destination, { idempotent: true });

  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  await AsyncStorage.setItem(storageKey(uid), destination);
  return destination;
}
