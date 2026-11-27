# Play Console — Data safety and photo access

Use this when filling the Google Play Data safety form and the Photo and Video Permissions declaration. It matches the app as shipped.

## Data safety

| Question | Answer |
|---|---|
| Does the app collect or share user data? | **Collects**, from two sources: anonymous usage analytics, only after the user opts in, and the usage and performance metrics the bundled Google ML Kit SDK sends Google whenever it reads a slip (see both sections below). Play counts data an SDK sends as collected by the app. The ledger is not sent to an OpenJot server. PostHog receives the analytics events as our service provider, which Play does not count as sharing. |
| Is data encrypted in transit? | Yes. Usage events go over HTTPS to `trajectonomics.com/openjot/ingest` from versions later than 1.6.0; versions up to 1.6.0 used the old OpenJot and MooJot hosts. All relay them to PostHog EU Cloud. ML Kit sends its metrics over HTTPS. The optional AksonOCR request also uses HTTPS. |
| Is collection optional? | Analytics: yes. It is off by default. Users opt in with "Share anonymous usage stats" in the welcome tour or My Moo, and can turn it off there. ML Kit metrics: no. The app cannot turn them off. |
| Can users ask for deletion? | They delete records in the app, or uninstall. The ledger is not held off-device. Turning analytics off deletes the anonymous ID on the phone; deletion of past events can be requested at privacy@trajectonomics.com. ML Kit metrics are held by Google, and OpenJot cannot delete them. |
| Financial info | Entered or imported by the user and stored only on the device. Not collected, not shared. |
| Photos | Read to import Thai bank slips. Stored as private copies inside the app. Not shared. |

Declare **Photos and videos** as collected for app functionality, not shared, processed on device.

### Opt-in usage analytics (PostHog)

Declare these as **collected**, **not shared**, **optional** (off until the user opts in), purpose **Analytics**, processed ephemerally: no; linked to the user's identity: no.

- **App activity → App interactions**: screen views, welcome-tour steps, slip scan started/finished/failed, record saved/deleted (kind only), statement imported (counts only), export format, settings changed.
- **Device or other IDs**: a random ID generated on the phone for analytics (not the advertising ID).
- PostHog sends no app performance data: exception capture and session replay are off. ML Kit does send performance data; see the next section.

The exact event list is `src/lib/analyticsEvents.ts`. Re-check this form whenever that file changes.

### Google ML Kit metrics

ML Kit (English slip text) sends Google metrics whenever it reads a slip. Google's disclosure is <https://developers.google.com/ml-kit/android-data-disclosure>, and it leaves the form answers to the developer. Per that page:

- What is sent: device information (manufacturer, model, OS version and build), app information (package name and version), a per-installation identifier, performance metrics, the API configuration (such as image format and resolution), input and output size, feature version, event type, and error codes. Not the photo or the recognized text.
- Purpose, in Google's words: diagnostics and usage analytics.
- Encrypted in transit (HTTPS). Google says it does not transfer this data to third parties.
- Users cannot turn it off in the app, so mark it as required collection.

In the form this most closely matches **App info and performance** (diagnostics, other performance data) and **Device or other IDs**, collected for **Analytics**. Because ML Kit's collection is required, **Device or other IDs** is required overall, even though the PostHog ID is optional. Check the current Play data-type definitions when you fill it in.

If the optional AksonOCR key stays in the product, also declare that photos may be sent to the OCR provider **only when the user supplies a key**. The default build path does not.

## Photo and video permissions

- Permission: `READ_MEDIA_IMAGES` (and `READ_MEDIA_VISUAL_USER_SELECTED` on Android 14+).
- Core use: scan the user's own Thai bank-slip albums.
- Alternative: the in-app picker uses `ACTION_GET_CONTENT`, so a user can import one slip or one PDF without granting album access.
- `Camera` and `Screenshots` folders are not scanned. Shared albums are off unless the user opts in, and a slip QR is required before OCR.

Paste this into the Play Console declaration ("Read media images: describe why the Android photo picker does not fully support your app's core functionality"):

```text
OpenJot is an expense tracker whose core feature is reading the payment slips that Thai banking apps (K PLUS, SCB EASY, Krungthai NEXT and others) save to the phone after every transfer. When the user taps Scan or pulls to refresh, OpenJot finds the new slips in those banks' albums and records each payment. People make several transfers a day, so picking every slip by hand in the photo picker would defeat the feature. OpenJot reads only bank-slip albums, never Camera or Screenshots, and reads the images on the device. Without this permission, users can still import a single slip with the system picker.
```

## Listing assets

- App icon: `src-tauri/gen/android/app/src/main/res/mipmap-*/`
- Feature graphic source: [play-feature-graphic.svg](play-feature-graphic.svg) (1024×500)
- Screenshots: capture 4–6 phone screens in Pink & White and Black & Orange (Home, empty month, Summary, My Moo) on a device. Do not invent them.

## Not in this pipeline

Biometric app lock and a Jetpack Glance home-screen widget were listed as optional. They are not included here.
