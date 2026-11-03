import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { get, ref, set, update } from "firebase/database";
import { firebaseAuth, firebaseDatabase } from "@/lib/firebase";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  address: string;
  photoURL?: string;
  createdAt?: string;
};

export async function getUserProfile(uid: string) {
  const snapshot = await get(ref(firebaseDatabase, `users/${uid}`));
  return snapshot.exists() ? (snapshot.val() as Partial<UserProfile>) : null;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
  phone: string,
) {
  const credential = await createUserWithEmailAndPassword(
    firebaseAuth,
    email.trim(),
    password,
  );

  await updateProfile(credential.user, { displayName });
  await set(ref(firebaseDatabase, `users/${credential.user.uid}`), {
    uid: credential.user.uid,
    email: credential.user.email,
    displayName,
    phone,
    address: "",
    createdAt: new Date().toISOString(),
  });

  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    email.trim(),
    password,
  );

  return credential.user;
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(firebaseAuth, email.trim());
}

export async function changeCurrentUserPassword(currentPassword: string, newPassword: string) {
  const user = firebaseAuth.currentUser;
  if (!user?.email) {
    throw new Error("No email/password user is currently signed in.");
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function updateUserProfile({
  uid,
  displayName,
  phone,
  address,
  photoURL,
}: {
  uid: string;
  displayName: string;
  phone: string;
  address: string;
  photoURL?: string;
}) {
  if (firebaseAuth.currentUser) {
    await updateProfile(firebaseAuth.currentUser, { displayName, ...(photoURL !== undefined ? { photoURL } : {}) });
  }

  await update(ref(firebaseDatabase, `users/${uid}`), {
    displayName,
    phone,
    address,
    ...(photoURL !== undefined ? { photoURL } : {}),
    updatedAt: new Date().toISOString(),
  });
}

export function getFirebaseAuthMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "profile/photo-read-failed":
      return "The selected photo could not be read. Choose another photo and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/weak-password":
      return "Use a password with at least 6 characters.";
    case "auth/requires-recent-login":
      return "For your security, enter your current password and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/invalid-action-code":
    case "auth/expired-action-code":
      return "This password reset link is no longer valid. Request a new one.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support for help.";
    default:
      return "Something went wrong. Check your Firebase setup and try again.";
  }
}

export function getChangePasswordMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  if (["auth/invalid-credential", "auth/wrong-password"].includes(code)) {
    return "Your current password is incorrect.";
  }

  return getFirebaseAuthMessage(error);
}
