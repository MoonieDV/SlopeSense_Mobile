import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ref, remove, set } from "firebase/database";

import { firebaseDatabase } from "@/lib/firebase";

function tokenKey(token: string) {
  return encodeURIComponent(token).replace(/\./g, "%2E");
}

export async function registerPushNotifications(uid: string) {
    if (Platform.OS !== "android") return () => undefined;

  let savedTokenRef: ReturnType<typeof ref> | null = null;
  let tokenSubscription: Notifications.Subscription | undefined;
  let isActive = true;

  const saveToken = async (value: unknown) => {
    const token = typeof value === "string" ? value : JSON.stringify(value);
    if (!token || token === "undefined" || !isActive) return;

    const nextTokenRef = ref(firebaseDatabase, `users/${uid}/fcmTokens/${tokenKey(token)}`);
    try {
      await set(nextTokenRef, {
        token,
        platform: Platform.OS,
        updatedAt: Date.now(),
      });
      if (savedTokenRef && savedTokenRef.toString() !== nextTokenRef.toString()) {
        await remove(savedTokenRef);
      }
      savedTokenRef = nextTokenRef;
    } catch (error) {
      console.warn("Unable to register push notification token", error);
    }
  };

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("announcements", {
        name: "Announcements",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
      await Notifications.setNotificationChannelAsync("rainfall-alerts", {
        name: "Sensor alerts",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (permission.status !== "granted") return () => undefined;

    const deviceToken = await Notifications.getDevicePushTokenAsync();
    await saveToken(deviceToken.data);
    tokenSubscription = Notifications.addPushTokenListener((nextToken) => {
      void saveToken(nextToken.data);
    });
  } catch (error) {
    console.warn("Unable to initialize push notifications", error);
  }

  return () => {
    isActive = false;
    tokenSubscription?.remove();
    if (savedTokenRef) void remove(savedTokenRef);
  };
}