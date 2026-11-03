# Firebase Cloud Messaging without Cloud Functions

The Android app registers native FCM tokens at `users/{uid}/fcmTokens/{encodedToken}` after sign-in and notification permission. The existing `fcm-poller/Code.gs` Google Apps Script checks Realtime Database once per minute and sends FCM HTTP v1 notifications for new announcements and confirmed environmental threshold transitions. No Cloud Functions, paid service, or new dependency is required. The first run establishes a baseline without sending existing conditions or announcements. Subsequent runs and repeated setup preserve the persistent state. New announcements must use Firebase push IDs. Apps Script quotas and polling latency still apply.

## Android app

The project is already configured with the Android Firebase file at the root as `google-services.json`. It must contain a client for `com.app.slopesensemobile`. After changing native Firebase configuration, rebuild and install the app with `pnpm android`; Expo Go cannot receive native FCM pushes. Sign in and allow notification permission before continuing.

## Configure the free poller

1. In Google Cloud Console, select Firebase project `slopesense-ec686`. Under **APIs & Services > Library**, enable **Firebase Cloud Messaging API**. Do not enable Cloud Functions for this approach.
2. Reuse the existing poller service account. It needs **Firebase Cloud Messaging API Admin** and database read/write access (for example **Firebase Realtime Database Admin**, replacing the previous Viewer-only role). Writes are required for the lease, persistent state, delivery audit, event history, and removal of invalid tokens. Do not add these permissions or credentials to the mobile app.
3. Create a JSON key for that service account and download it. Treat this file as a secret; never commit it or put it in the app. You need its `client_email` and full `private_key` values.
4. Open the existing project in [Google Apps Script](https://script.google.com/) and replace its editor contents with `fcm-poller/Code.gs`. Keep a single active poller deployment. The RTDB lease excludes overlapping upgraded pollers, but an old poller or old Cloud Function does not honor that lease. Do not deploy `functions/`; if legacy senders are already deployed, disable them before enabling this poller.
5. In Apps Script, open **Project Settings > Script Properties** and add:
	- `projectId`: `slopesense-ec686`
	- `clientEmail`: the service account JSON's `client_email`
	- `privateKey`: the full `private_key`, including the `BEGIN PRIVATE KEY` and `END PRIVATE KEY` lines
	- `databaseUrl`: `https://slopesense-ec686-default-rtdb.asia-southeast1.firebasedatabase.app`
6. Merge the RTDB rules below with the existing deployed rules. Then select `setupFreeFcmPoller` and click **Run**. Accept the Google authorization prompts. On first upgrade, the script initializes `fcmPoller/state` from current conditions; the old Script Property `pollerState` is no longer used. Do not delete the new state during routine redeployment. Setup installs the one-minute trigger. Check **Executions** for errors.
7. Rebuild/install the resident Android app and observe real sensor transitions. Changing only `level` no longer creates a push. Qualifying readings must have new valid timestamps. Do not write fake readings or send mock notifications to production. Verify a real event in `notificationEvents`, its delivery status, and notification tap behavior on a signed-in Android device. The phone must be online and not force-stopped.

## RTDB paths and rules

Existing sensor and token paths are unchanged. Only additive notification records are written:

- `sensors/{slope-01,soilSensor,tiltSensor,vibrationSensor}/latest`: read only. Rain uses calibrated `rawValue` on the existing 0–1023 scale; soil uses `moisturePercent`. No sensor calculations or thresholds in the dashboard are changed.
- `announcements`: existing creation cursor and announcement delivery remain supported.
- `notificationEvents/{eventId}`: resident-readable title, body, category, classification, event timestamp and delivery summary. The existing Alerts & Announcements screen shows the latest 100 events and opens the tapped event. No tokens or technical sensor values appear here.
- `fcmPoller/state`: last processed reading IDs/timestamps, candidate confirmations, highest notified/suppressed classifications, last notification times, recovery counters and overall state.
- `fcmPoller/lease`, `fcmPoller/outbox`, `fcmPoller/deliveries`: server-only execution lease, pending per-device sends and completed delivery audit. Completed audits retain hashes/statuses rather than plaintext tokens.

Merge this fragment into the existing `rules` object; **do not replace existing auth, sensor, user or announcement rules**:

```json
{
  "notificationEvents": {
    ".read": "auth != null",
    ".write": false,
    ".indexOn": ["timestamp"]
  },
  "fcmPoller": { ".read": false, ".write": false }
}
```

The server service account uses IAM-authorized OAuth access. RTDB rules cascade: an ancestor `.read: true` or `.write: true` also grants access to these children despite child denials. Keep server paths inaccessible to client accounts and use the project's existing resident-access predicate in place of `auth != null` if one exists. No deployed rules file or Apps Script deployment configuration is present in this repository; deployment and permissions must be applied in the existing consoles.

## Confirmation, cooldown and recovery

Optional Apps Script properties (all durations are seconds):

| Property | Default | Meaning |
| --- | --- | --- |
| `confirmationReadings` | 2 | Distinct consecutive qualifying observations for individual alerts |
| `recoveryReadings` | 3 | Distinct consecutive safe observations required to rearm |
| `cooldownSeconds` | 600 | Minimum time between individual notifications for the same sensor |
| `maxReadingAgeSeconds` | 300 | Maximum reading age and gap allowed for confirmation |
| `maxDeliveryAttempts` | 5 | Maximum attempts for explicit retryable FCM failures |
| `deliveryMaxAgeSeconds` | 1800 | Maximum age of an event eligible for delivery retry |

Rain qualifies at 601–800 or 801–1023; soil at 60–<80 or 80–100. Tilt/vibration use their existing boolean/detection fields. A sensor rearms only after returning below its lowest qualifying threshold (rain <601, soil <60, movement false) for the recovery count. Downgrades do not notify. Escalation is allowed once per episode after confirmation/cooldown; a delayed alert still requires a fresh qualifying reading. Stable conditions, repeated polls, and restarts do not generate new events.

Danger is heavy rain AND soil >=80 AND (tilt OR vibration). It immediately bypasses individual confirmation/cooldown, suppresses simultaneous individual alerts, and consumes their classifications. Danger rearms only after fresh readings confirm the combined condition has cleared. Missing/stale/invalid inputs do not prove recovery. All inputs used for Danger must be fresh, valid readings from the monitored devices above.

Readings require `receivedAt`, `updatedAt`, or `timestamp` as epoch milliseconds, epoch seconds, or an ISO timestamp. An uptime counter alone is not sufficient. Optional `readingId`/`id` deduplicates alongside strictly increasing timestamps. Invalid ranges are ignored, not recalibrated. Because this existing poller reads `latest`, confirmation counts observations seen by the poller, not every upstream sensor sample; short events between polls may be missed.

## Delivery guarantees and diagnosis

An Apps Script lock plus an RTDB ETag lease prevent overlapping sends. A terminated execution's lease expires after ten minutes. State changes and queued events are committed atomically. Each recipient is checkpointed before sending, and accepted recipients are not retried. FCM error responses 401/429/5xx use bounded exponential backoff with jitter and respect `Retry-After`. Unregistered or explicitly invalid registration tokens are removed using compare-and-delete. Generic payload errors never delete tokens. Empty recipient lists are recorded without sending a later backlog.

`accepted` means FCM accepted the request, **not confirmed delivery to a phone**. `unknown` means an interrupted request may have been accepted, including a crash between sending and recording the result. FCM HTTP v1 has no exactly-once idempotency key: unknown attempts are not automatically resent, favoring duplicate prevention at the cost of possible missed delivery. The event remains in app history. Stable Android notification tags also prevent multiple tray entries for the same event. Explicit failures/expiry are recorded; one invalid token does not block other recipients. Consult `fcmPoller/deliveries` and Apps Script executions for failures. Credentials stay in Script Properties and OAuth access tokens in the server cache.

Run isolated regression tests with `pnpm exec vitest run tests/fcm-poller.test.mjs`, and check the app with `pnpm check`. Tests use in-memory fixtures only, with no Firebase connection or device sends. Keep live verification limited to actual sensor data. Periodically archive old completed audits/history according to the project's retention policy; outbox entries are removed on completion and the app query is limited to 100 events.

iOS token registration is not implemented; this setup is Android-only.
