import { onValue, ref } from "firebase/database";

import { firebaseDatabase } from "@/lib/firebase";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  timestamp: number;
};

type UnknownRecord = Record<string, unknown>;

function textValue(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function timestampValue(record: UnknownRecord) {
  const value = record.timestamp ?? record.createdAt ?? record.updatedAt ?? record.date;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseAnnouncements(value: unknown): Announcement[] {
  if (!value || typeof value !== "object") return [];

  return Object.entries(value as UnknownRecord)
    .map(([id, raw]) => {
      if (!raw || typeof raw !== "object") return null;
      const record = raw as UnknownRecord;
      const title = textValue(record, ["title", "subject", "name"]);
      const body = textValue(record, ["message", "body", "content", "description"]);
      if (!title && !body) return null;

      return {
        id,
        title: title || "Announcement",
        body,
        timestamp: timestampValue(record),
      } satisfies Announcement;
    })
    .filter((announcement): announcement is Announcement => announcement !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function subscribeToAnnouncements(
  onData: (announcements: Announcement[]) => void,
  onError?: (error: Error) => void,
) {
  return onValue(
    ref(firebaseDatabase, "announcements"),
    (snapshot) => onData(parseAnnouncements(snapshot.val())),
    (error) => {
      onData([]);
      onError?.(error);
    },
  );
}

export function formatAnnouncementDate(timestamp: number) {
  if (!timestamp) return "Recently posted";
  return new Date(timestamp).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
