import { onAuthStateChanged } from "firebase/auth";
import { limitToLast, onValue, orderByChild, query, ref } from "firebase/database";
import { firebaseAuth, firebaseDatabase } from "@/lib/firebase";

export type NotificationEvent = {
  id: string;
  title: string;
  body: string;
  category: string;
  classification: string;
  severity: "info" | "warning" | "danger";
  timestamp: number;
};

export function parseNotificationEvent(id: string, value: unknown): NotificationEvent | null {
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  if (!["title", "body", "category", "classification"].every((key) => typeof event[key] === "string" && event[key])) return null;
  const timestamp = Number(event.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  if (!["info", "warning", "danger"].includes(String(event.severity))) return null;
  return { id, title: String(event.title), body: String(event.body), category: String(event.category),
    classification: String(event.classification), severity: event.severity as NotificationEvent["severity"], timestamp };
}

export function subscribeToNotificationEvents(onData: (events: NotificationEvent[]) => void, onError: (error: Error) => void) {
  let unsubscribeEvents: (() => void) | undefined;
  const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
    unsubscribeEvents?.();
    unsubscribeEvents = undefined;
    onData([]);
    if (!user) return;
    unsubscribeEvents = onValue(query(ref(firebaseDatabase, "notificationEvents"), orderByChild("timestamp"), limitToLast(100)), (snapshot) => {
      const events = Object.entries(snapshot.val() || {}).map(([id, value]) => parseNotificationEvent(id, value))
        .filter((event): event is NotificationEvent => event !== null).sort((a, b) => b.timestamp - a.timestamp);
      onData(events);
    }, onError);
  });
  return () => { unsubscribeAuth(); unsubscribeEvents?.(); };
}
