# OpenJot Privacy Policy

**Last updated: 27 November 2026**

Trajectonomics publishes OpenJot (formerly MooJot), a personal income and expense tracker. This policy says what the Android app and the OpenJot pages at <https://trajectonomics.com/openjot/> do with information. The same text is shown in My Moo → About → Privacy.

The short version: the ledger stays on your phone. Trajectonomics has no account server and does not receive your records. OpenJot sends us nothing about how you use it unless you choose to share anonymous usage statistics (which screens and features get used, never your records, amounts, or slips). That switch is off until you turn it on. Separately, to read English text on slips, the app uses Google ML Kit. ML Kit reads the photo on the phone, but it sends Google metrics about its own performance and use, such as your device model and a per-installation identifier. OpenJot cannot switch that off. The section "Google ML Kit metrics" below lists what is sent. The website uses cookies only if you allow them. The only upload of a slip image the code can make is optional. It happens only if an AksonOCR API key is already stored in the local database. The settings screen does not ask for that key.

This policy is written so a person can read it. It is the project's description of its own behavior. It is not a certificate of compliance, and it is not legal advice.

## Who we are

OpenJot is published by Supakone Kongprapan under the name Trajectonomics, at <https://github.com/trajectonomics/trajectonomics/tree/main/apps/openjot>. In this policy, "we" and "Trajectonomics" mean Supakone Kongprapan, who is the data controller for the personal data this policy describes. You can reach us about privacy at [privacy@trajectonomics.com](mailto:privacy@trajectonomics.com).

Because the ledger never reaches us, we cannot see it, correct it, or delete it from our side. You hold it on your phone.

## Information that stays on the phone

OpenJot stores the following in the app's private files. None of it is sent to an OpenJot server, except the random usage-statistics ID and events described in "Anonymous usage statistics", if you turn that switch on.

| Data | Where | Why |
| --- | --- | --- |
| Income and expense records: amount in satang, currency, date, time, account, category, payee, note, tags, source | SQLite on the phone | Your ledger |
| Budgets, recurring rules, categories, tags, and the bank list you enable | SQLite on the phone | Categories, limits, and which albums to scan |
| Slip photo, QR contents, recognized text, and a hash of the image | App private storage and SQLite | Attach the slip you imported |
| Text taken from a credit-card statement PDF | SQLite, as records | Import a statement you chose |
| PDF password | Phone memory for that import only | Open the file. It is not written to the database. |
| Owner names you type, language, month-start day, week start, shared-album switch | SQLite on the phone | Tell your own transfers apart, and set the calendar |
| AksonOCR API key and model name, if a key is present | SQLite on the phone, as plain text | Optional cloud OCR. The key is not encrypted by a separate OpenJot secret. |
| Ids of photos already scanned, and months already scanned | SQLite on the phone | Do not repeat work |
| Daily counts of slips synced and records categorized | SQLite on the phone | A local activity count, not a remote log |
| Theme (pink or dark) and hand (left or right) | localStorage on the phone | Remember appearance. These two keys are not tracking cookies. |
| The usage-statistics switch and, while it is on, a random anonymous ID and the queue of events not yet sent | localStorage on the phone | Remember your choice, and send the statistics described below |

Slip photos and statement lines can contain names, account details, amounts, and other personal data protected by Thailand's Personal Data Protection Act (PDPA). That is why it stays in the app's private storage unless you export it or turn on the optional OCR key described below.

## How information gets there

You type a record, you scan a bank album, you pick one photo, or you pick a statement PDF. The app can also read albums you enable, using Android photo access (`READ_MEDIA_IMAGES`, and `READ_MEDIA_VISUAL_USER_SELECTED` on Android 14 and newer). On older Android versions the manifest also declares `READ_EXTERNAL_STORAGE`, limited to those old versions.

You can import one slip or one PDF with the system picker instead of granting album access. Shared albums stay off until you turn them on. The scanner looks for a slip QR before it treats a photo as a slip. Camera and Screenshots folders are not the scan target.

On-device tools read the slip locally: a QR decoder, ML Kit Latin for English text, and AksonOCR-Lite (an ONNX model) for Thai text. Those steps do not send the photo to Trajectonomics or to Google as part of OpenJot's design. ML Kit does send Google metrics about how it runs, described in the next section.

The manifest declares `INTERNET` so ML Kit can send those metrics, and so the optional OCR request below and the optional anonymous usage statistics can use HTTPS. The manifest also declares `POST_NOTIFICATIONS`. The current app does not send notification content anywhere and does not use notifications to collect data.

## Google ML Kit metrics

OpenJot uses Google ML Kit text recognition to read English text on a slip. ML Kit is a library made by Google. It is not open source, and Google's ML Kit Terms of Service apply to it: <https://developers.google.com/ml-kit/terms>

ML Kit reads the photo on the phone. Google states that ML Kit does not send the image, or the text it reads, to Google servers. It does send Google metrics about the performance and use of ML Kit in the app. Google's ML Kit data disclosure (<https://developers.google.com/ml-kit/android-data-disclosure>) lists these kinds of data:

- device information, such as the manufacturer, model, Android version and build
- app information: the package name and app version
- a per-installation identifier, which Google says is not intended to identify a user or a physical device
- performance metrics, such as how long recognition took
- the API configuration, such as the image format and resolution, and the size of the input and output
- the ML Kit feature version, the type of event (such as start-up, a recognition run, or a release), and error codes

Google says ML Kit sends this over HTTPS, uses it for diagnostics and usage analytics, and does not transfer it to third parties. Google's Privacy Policy (<https://policies.google.com/privacy>) applies to it. Trajectonomics does not receive these metrics and cannot delete them.

OpenJot has no setting that switches these metrics off, and Google's documentation does not describe one. The "Share anonymous usage stats" switch controls only OpenJot's own statistics, not ML Kit. ML Kit's text reader runs when you scan bank albums, pick a slip photo, share a slip to OpenJot, or re-parse slips. Typing a record by hand does not use it.

## Optional AksonOCR upload

If, and only if, the local settings contain a non-empty AksonOCR API key, and a slip still needs Thai text, the app can send that slip image over HTTPS to AksonOCR at `https://backend.aksonocr.com/api/v2/ocr`. The image can contain the personal and financial details printed on the slip. The API key is sent with that request.

We do not operate AksonOCR. We do not get a copy of the image back onto a server of ours. What AksonOCR stores, and for how long, is governed by AksonOCR, not by this policy. Leave the key empty and this request is not made. A new install has an empty key.

The My Moo screen that describes local OCR is about the on-device model. It does not switch this optional path off if a key is already in the database.

## Anonymous usage statistics

This is optional and off by default. The welcome tour asks on its privacy step, and the switch "Share anonymous usage stats" in My Moo changes it at any time. Until you turn it on, the code that sends statistics is not loaded at all, and nothing is collected to send later. If you turn it on, the app sends a small set of usage events so we can see which features people use and where they get stuck.

What an event can contain:

- its name, for example that you turned the statistics on, that the app was opened, a screen was viewed, a welcome-tour step was viewed, photo access was allowed or refused, a slip scan started, finished or failed, a record was saved or deleted, a statement was imported, data was exported, or a setting changed
- for some events, a short label or count: the screen name, the kind of record (spending, income or transfer), whether it was new or recurring, how many slips or statement lines were imported or skipped as duplicates, the export format, or the new value of the theme, hand, language or month-start setting
- the app version, the app's language and theme, and technical details the analytics library adds, such as the Android and WebView version, device type, screen size, and time zone
- a random ID created on the phone, so events from the same install can be counted together, and a session ID

The list of allowed events and labels is in the app's source code (`src/lib/analyticsEvents.ts`), and the app drops anything not on it before sending. Events never contain amounts, payees, notes, category, tag or account names, slip images, OCR text, file names, or anything you type. We do not link the random ID to your name, email, phone number, or advertising ID. There is no session recording and no automatic capture of what is on the screen.

Events go over HTTPS to `trajectonomics.com/openjot/ingest` from versions later than 1.6.0, to `openjot.trajectonomics.com` from versions 1.5.0 through 1.6.0, and to `moojot.trajectonomics.com` from versions before 1.5.0. All three pass them to PostHog, our analytics provider, on its EU Cloud. PostHog receives the IP address of the connection and uses it to estimate your country and city. Turning the switch off stops sending at once and resets the random ID, so if you turn it on again, the app starts with a new ID. Because the ID is not linked to you, we usually cannot find past events for one person. Ask through the contact links below if you want us to try.

## Website

The OpenJot pages live on the Trajectonomics Site at <https://trajectonomics.com/openjot/>. The Site asks before it sets an analytics cookie, and its own notice and privacy terms apply to the landing page. This section describes what the OpenJot short links and the comparison page under <https://trajectonomics.com/openjot/> still do.

The OpenJot website counts clicks on its short links and downloads of the app without cookies. For each one, the site's server records only where the click came from (for example, which social post or campaign link), the country our hosting provider (Cloudflare) resolved, a coarse platform (Android, iPhone, desktop, or other), and which in-app browser was used, if any. It sends that to PostHog with a new random ID every time, so clicks cannot be tied together. It does not send your IP address or browser details for these counts.

Its comparison page still asks with its own cookie banner. If you tap "Allow" there, the page also loads PostHog's web analytics from its own domain. PostHog then sets a cookie and uses local storage to count your visits and see which pages and buttons you use, and it receives your IP address to estimate your location. If you tap "No thanks", or ignore the banner, none of that loads. You can change your choice at any time with "Cookie settings" at the bottom of that page. Saying no again deletes the PostHog cookie and storage.

That page remembers your language and your cookie choice in local storage.

## What we do not collect

We do not collect:

- an OpenJot account, email, or password
- a payment card for Trajectonomics (the app is free and we take no payment)
- advertising identifiers or crash reports
- any analytics event that contains your records, amounts, payees, notes, or slips
- your contacts, location, or microphone
- the ledger, by any automatic upload

Google receives the ML Kit metrics described above. We do not.

We do not sell personal information. We do not share it for cross-context advertising. We do not train a model on your records.

## When information leaves the phone

Information leaves the phone only in these cases:

- You export CSV or JSON, or you use the Android share sheet. The file goes to the app you pick. We do not upload it.
- ML Kit reads a slip, and sends Google the metrics described in "Google ML Kit metrics". This does not include the photo or the text read from it.
- You stored an AksonOCR API key, and the app sends one slip image to AksonOCR as described above.
- You turned on usage statistics, and the app sends the anonymous events described above.
- You send us feedback or a question by email. Your email app sends it to support@trajectonomics.com. We receive your email address, your message, and the details the app adds (app version, Android version, app language). It is kept in our email inbox, which runs on Cloudflare, and that inbox's AI assistant may read incoming mail to help draft replies. We may summarise what you wrote, without your name or email address, in a public issue on GitHub.
- You copy text into a GitHub issue or a security report yourself. Do not put real account numbers, slip photos, or a full ledger in a public issue.

Banks, Google (including Google Play and ML Kit), Android, AksonOCR, PostHog, and Cloudflare are third parties. Their own terms apply when you use them. We are not responsible for their outages or their privacy practices.

## How long it stays

Records stay on the phone until you delete them, clear the app's storage, or uninstall OpenJot. Android normally deletes the app's private storage on uninstall. A backup you made, or a file you exported, is outside the app and stays until you delete that copy.

We have no server copy of the ledger, so the ledger has no server retention period. We also have no server backup we could restore for you.

Usage statistics and website counts are kept in PostHog for as long as our PostHog plan retains data, and we may delete them sooner.

## Security

The database sits in the app's private storage, which other apps are not supposed to read. That is not the same as a promise of encryption at rest.

OpenJot has an optional app lock (My Moo → App lock), off until you turn it on. When it is on, the app asks for your fingerprint, face, or phone PIN when it opens and after more than a minute away. Android shows that prompt and checks it. OpenJot only learns whether the unlock worked. Your fingerprint, face, and PIN never reach OpenJot. The lock covers the screen. It does not encrypt the database.

No method of storage is perfectly safe. Someone who unlocks your phone, or who has a backup of it, may be able to read the database. If you save an AksonOCR key, it is stored in that database as plain text.

The optional OCR call and the usage statistics use HTTPS. A PDF password is used in memory to decrypt the file and is not saved.

## Your choices

On the phone you can:

- edit or delete a record
- turn banks and shared albums on or off
- refuse photo access and use the picker instead
- turn anonymous usage statistics on or off in My Moo
- export a copy
- uninstall the app and remove its private storage

Those are the practical ways to access, correct, and delete the ledger. We cannot do those steps for you, because we never receive the data.

### Thailand (PDPA)

If the PDPA applies to you, the personal data in OpenJot's ledger is processed on your device for your own household ledger. Trajectonomics does not collect that ledger onto its own system. For the optional AksonOCR send, you cause the transfer by having a key stored, and AksonOCR is the recipient.

This is the data we do handle, why, and on what legal basis:

- **Anonymous usage statistics from the app** (the random ID, the events listed above, and the IP address PostHog sees): to learn which screens and features get used and where people get stuck, so we can improve the app. Basis: your consent (PDPA section 19). The switch is off until you turn it on.
- **Website analytics cookies** (PostHog's cookie, the pages and buttons you use, and your IP address): to learn how people find the website and whether it works. Basis: your consent, given with "Allow" on the comparison page's cookie banner or the Site's cookie notice.
- **Cookieless website counts** (link source, country, coarse platform, in-app browser): to count which links bring people in. They carry no IP address, browser details, or lasting ID, so they are not linked to a person. Basis: our legitimate interest in knowing which links work (section 24(5)).
- **ML Kit metrics** go to Google when ML Kit reads a slip, as described in "Google ML Kit metrics". They are part of the slip reading you ask the app to do (section 24(3)), and Google uses them for diagnostics and usage analytics under its own Privacy Policy. To avoid them, type your records by hand instead of scanning.

For the data we handle, you have these rights under the PDPA:

- withdraw your consent at any time: the switch in My Moo for the app, and "Cookie settings" on the comparison page. Withdrawing doesn't undo processing that happened before.
- ask for access to and a copy of your data, and ask how we got it
- ask for your data in a readable, commonly used format, or for us to send it to someone else
- object to our use of it
- ask us to delete it, destroy it, or make it anonymous
- ask us to restrict its use
- ask us to correct it
- complain to the Office of the Personal Data Protection Committee (PDPC): <https://www.pdpc.or.th>

Usage statistics are linked only to a random ID that we can't tie to you, so we may not be able to find your events. We will still try if you ask through the contact links below. A request to delete data we do not hold can only be answered by pointing you back to the app, the uninstall step, and, if you used it, AksonOCR.

**Sending data outside Thailand.** PostHog stores usage statistics and website analytics on its EU Cloud, in the European Union, where the GDPR protects personal data. Turning on usage statistics, or tapping "Allow" on the cookie banner, includes agreeing to that transfer. Cloudflare, which runs the website and passes events on to PostHog, handles requests in data centres around the world. Google may process ML Kit metrics in the United States and other countries, under its own safeguards.

### European Economic Area and the United Kingdom

If you use the app from the EEA or the UK, the same facts apply. We do not operate a server that holds your ledger, so we are not in a position to act as a remote controller of that ledger. The legal basis for any optional image you send to AksonOCR is the step you take by storing a key and scanning. You can stop that path by clearing the key or leaving it empty. Rights of access, correction, deletion, and portability for the ledger are exercised on the device, including by export and uninstall. Anonymous usage statistics and website analytics both run only with your consent, and you can withdraw it at any time: the switch in My Moo for the app, and "Cookie settings" on the website. PostHog processes those events on its EU Cloud.

We do not transfer your ledger outside your phone. ML Kit metrics go to Google, and an optional AksonOCR request goes to that provider. Each may process the data in whatever country it uses, under its own safeguards.

### California

We do not sell personal information and we do not share it for cross-context behavioral advertising. We do not offer a financial incentive for personal information. Categories that can exist on the device are identifiers inside a slip (such as a name or account reference), financial information you enter, photos you import, and the local settings listed above. We do not collect those categories onto an OpenJot server. The anonymous usage statistics and website counts described above are internet activity information, sent to PostHog as our service provider. Google receives ML Kit metrics, including a per-installation identifier, as described above.

## Children

OpenJot is not directed at children under 13, and we do not knowingly collect personal information from children on a server. Anonymous usage statistics are not linked to a person. If you are under 20, ask a parent or guardian before you turn on usage statistics or allow cookies on the website. The app has no account that a child could register with us. If a child uses a phone where the app is installed, the records remain on that phone.

## Changes to this policy

We will change the "last updated" date when this policy changes, and we will put the new text in the app's About screen and in `docs/privacy-policy.md` on GitHub. Please read it when the date changes. Continuing to use the app after the new date means you accept the update.

## Contact

Questions about this policy, and privacy requests we are actually able to answer, including the PDPA requests above, go to:

- Email: [privacy@trajectonomics.com](mailto:privacy@trajectonomics.com). Use this for anything about you, because it is private.
- Public questions about the app: <https://github.com/trajectonomics/trajectonomics/issues>
- Security: <https://github.com/trajectonomics/trajectonomics/security/advisories/new>

There is no postal address published for this project. Please do not include real bank details, slip images, or an API key in a public issue.
