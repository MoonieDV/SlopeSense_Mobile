import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

type FirebaseExtraConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  databaseURL?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

const extraFirebaseConfig =
  (Constants.expoConfig?.extra?.firebase as FirebaseExtraConfig | undefined) ??
  (Constants.manifest2?.extra?.expoClient?.extra?.firebase as FirebaseExtraConfig | undefined) ??
  {};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? extraFirebaseConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? extraFirebaseConfig.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? extraFirebaseConfig.projectId,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? extraFirebaseConfig.databaseURL,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? extraFirebaseConfig.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? extraFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? extraFirebaseConfig.appId,
};

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDatabase = getDatabase(firebaseApp);
