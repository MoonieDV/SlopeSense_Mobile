# Firebase Cloud Messaging without Cloud Functions

The Android app registers native FCM tokens at `users/{uid}/fcmTokens/{encodedToken}` after sign-in and notification permission. For a no-cost alternative to Firebase Cloud Functions, `fcm-poller/Code.gs` is a Google Apps Script that checks Realtime Database once per minute and sends FCM messages for new announcements and sensor level changes. It sends no initial backlog when first initialized. New announcements should use Firebase push IDs (the standard auto-generated Realtime Database keys) so the poller can identify records created after its initial cursor. Notifications may take about a minute to arrive, and Apps Script quotas apply. This avoids enabling Cloud Functions or upgrading Firebase to Blaze; it is not an instantaneous database trigger.

## Android app

The project is already configured with the Android Firebase file at the root as `google-services.json`. It must contain a client for `com.app.slopesensemobile`. After changing native Firebase configuration, rebuild and install the app with `pnpm android`; Expo Go cannot receive native FCM pushes. Sign in and allow notification permission before continuing.

## Configure the free poller

1. In Google Cloud Console, select Firebase project `slopesense-ec686`. Under **APIs & Services > Library**, enable **Firebase Cloud Messaging API**. Do not enable Cloud Functions for this approach.
2. Under **IAM & Admin > Service Accounts**, create a service account such as `slope-fcm-poller`. Grant it **Firebase Realtime Database Viewer** and **Firebase Cloud Messaging API Admin** on the project.
3. Create a JSON key for that service account and download it. Treat this file as a secret; never commit it or put it in the app. You need its `client_email` and full `private_key` values.
4. Open [Google Apps Script](https://script.google.com/) while signed into a Google account. Create a project and replace the editor contents with `fcm-poller/Code.gs` from this repository.
5. In Apps Script, open **Project Settings > Script Properties** and add:
	- `projectId`: `slopesense-ec686`
	- `clientEmail`: the service account JSON's `client_email`
	- `privateKey`: the full `private_key`, including the `BEGIN PRIVATE KEY` and `END PRIVATE KEY` lines
	- `databaseUrl`: `https://slopesense-ec686-default-rtdb.asia-southeast1.firebasedatabase.app`
6. Select `setupFreeFcmPoller` in the function dropdown and click **Run**. Accept the Google authorization prompts. The setup reads current records as its baseline, then installs a one-minute trigger. Check **Executions** in Apps Script if setup reports a permission error.
7. Add a new announcement or change a sensor's `level`. Check the Apps Script execution log for errors and allow up to a minute for the push. The phone must be online and must not have force-stopped the app in Android settings.

The script sends through FCM HTTP v1 using the service-account key stored in Apps Script properties. Revoke that key in Google Cloud IAM if it is ever exposed. Apps Script has free quotas and may pause or stop when those quotas are exceeded. The existing `functions/` source is the lower-latency alternative, but deploying it requires Firebase Blaze billing.

iOS token registration is not implemented; this setup is Android-only.