# Terms of Service

**Last updated: 23 November 2026**

These terms are a contract between you and Supakone Kongprapan, who publishes the MooJot app under the name Trajectonomics. In these terms, "Trajectonomics", "we" and "us" mean Supakone Kongprapan. They are written in plain language. They are not a promise that a court will enforce every sentence, and they do not replace advice from your own lawyer.

The copyright notice in the project license names Trajectonomics. Notices under these terms go to the GitHub repository named below.

## 1. What MooJot is

MooJot is a free, open-source personal income and expense tracker for people who use Thai banks and e-wallets. You install it on your own phone. Your ledger is a SQLite database in the app's private storage. Trajectonomics does not run an account server for MooJot and does not receive a copy of your ledger.

"Service" means the MooJot Android app and the open-source project at <https://github.com/trajectonomics/moojot>. "You" means the person who installs or uses it. A "bank account" or "cash account" inside the app is a label you keep on your phone. It is not a MooJot login, and it is not an account at a bank.

## 2. How you accept these terms

You accept these terms by installing or using MooJot. If you do not agree, do not install the app, and uninstall it if it is already on your phone.

There is no separate signup screen. Continued use after these terms change is acceptance of the new terms.

## 3. Who should use it

MooJot is a personal finance tool for adults. It is not made for children under 13. Do not use it to keep someone else's money records unless you have the right to do that.

## 4. Not a bank, and not professional advice

MooJot is not a bank, a payment service, a wallet, a broker, an investment adviser, an accountant, or a tax service. Trajectonomics is not acting in any of those roles.

Amounts, categories, budgets, payee names, slip text, and statement lines can be wrong. On-device text recognition, QR reading, and automatic categories are helpers. They are not a check against your bank. A credit-card statement import can misread a line. You are responsible for comparing MooJot with your bank, your card issuer, and any filing you make to the Revenue Department or anyone else.

MooJot is not affiliated with, endorsed by, or sponsored by any bank, e-wallet, card issuer, or app it can read slips or statements from. Their names belong to their owners, and MooJot uses them only to say what it can read.

Nothing in the app is financial, tax, accounting, or legal advice. Do not use a figure from MooJot as the only basis for a loan, a tax return, a dispute with a bank, or any other decision that matters. Check the source, or ask a qualified person.

## 5. Your records stay yours

You own the records, notes, photos, and statement text you put into MooJot. Trajectonomics does not take a license to that material, because the app keeps it on your phone and does not upload the ledger to us.

You decide when to export a CSV or JSON file, or when to use the Android share sheet. That file goes only where you send it.

If you save an AksonOCR API key in the local database, and the app then sends a slip image to AksonOCR, that send is covered in section 8 and in the Privacy Policy. The current settings screen does not ask you for that key. The app still contains the code path.

## 6. The source code license is separate

The MooJot source code is licensed under the MIT License, copyright 2026 Trajectonomics. That license covers copying, modifying, and distributing the source code. These terms cover use of the app we publish.

If these terms and the MIT License ever disagree about copying the source code, the MIT License controls that copying. These terms do not remove the MIT License. A fork of the source code is still the fork's own app, and these terms do not automatically bind people who only receive source code from someone else.

The published app also contains third-party components under their own licenses. One of them, Google ML Kit, is not open source. Google provides it under the ML Kit Terms of Service (<https://developers.google.com/ml-kit/terms>), which include the Google APIs Terms of Service. The MIT License covers MooJot's own source code, not ML Kit.

The pig artwork, the name MooJot, and the way the app is presented are part of this project. The MIT License still applies to the source as stated in the LICENSE file. Do not present a modified app as the official MooJot build from Trajectonomics.

## 7. Acceptable use

You agree not to:

- use MooJot to forge, hide, or dress up records for fraud, money laundering, or any other crime
- point the scanner at photos you are not allowed to read
- use the app to break into someone else's phone, account, or files
- overload, scrape, or attack the project, the issue tracker, or the optional OCR provider
- break the law while using the app

You are responsible for the photos and PDFs you choose to open.

## 8. Third-party OCR

Thai and English text on a slip are read on your phone, using a local model (AksonOCR-Lite) and Google ML Kit. That on-device reading does not send the photo to Trajectonomics. Google states that ML Kit does not send the photo, or the text it reads, to Google either.

ML Kit does send Google metrics about its performance and use, such as your device model, the app version, a per-installation identifier, timings, and error codes. Google's terms and privacy policy govern those metrics, and the Privacy Policy lists them. The app has no setting that switches them off. If you do not want Google to receive them, type your records by hand instead of scanning slips.

Separately, the app can send a slip image to AksonOCR at `backend.aksonocr.com` when a non-empty AksonOCR API key is stored in the local settings and the parser still needs Thai text. AksonOCR is not our service. Its terms and privacy policy are its own. We do not control its uptime, its prices, its models, or what it does with an image after you send it. If you do not store a key, that request is not made.

## 9. Privacy

The Privacy Policy at `docs/privacy-policy.md`, and the same text in My Moo, is part of these terms. It describes what stays on the phone, the metrics Google ML Kit sends to Google, and the one optional upload of a slip image.

## 10. Price

The app is free. Trajectonomics does not charge a fee for MooJot and does not take card payments. A third party such as AksonOCR may charge you under its own terms if you choose to use it. Google Play's own terms apply to how you install the app from that store.

## 11. No warranty

The app is provided "as is" and "as available". To the fullest extent Thai law allows, Trajectonomics disclaims every warranty, whether express, implied, or statutory, including any warranty of accuracy, merchantability, fitness for a particular purpose, quiet enjoyment, and non-infringement.

We do not promise that:

- the app will be uninterrupted, timely, or error-free
- a scan, a category, a budget, or a total will match your bank
- your phone, your photos, or your database will never be lost or corrupted
- an update will keep every feature you use today

Some jurisdictions do not allow certain disclaimers. In those places, the disclaimers apply only as far as the law allows. Rights you have as a consumer under Thai law, where they cannot be waived, stay with you.

## 12. Limitation of liability

To the fullest extent Thai law allows, Trajectonomics and its contributors will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost data, lost goodwill, or the cost of substitute software, whether or not we were told those damages were possible.

Our total liability for all claims relating to the app will not exceed the greater of (a) the amount you paid Trajectonomics for MooJot in the twelve months before the claim, or (b) one hundred US dollars (USD 100). The amount in (a) is zero while the app is free.

This limit does not apply to liability that Thai law does not allow us to limit, including fraud, willful misconduct, or death or personal injury caused by negligence, where those limits are prohibited.

You use a money tracker on hardware we do not control. Keep your own backup if the records matter. Uninstalling the app, or clearing its storage, deletes the local database.

## 13. Your responsibility to us

You will indemnify Trajectonomics and its contributors against claims, losses, and reasonable expenses, including legal fees, that come from your records, your photos, your PDFs, your misuse of the app, or your breach of these terms. This section applies to the extent Thai law allows. It does not shift responsibility for our own fraud or willful misconduct.

## 14. How long these terms last

These terms apply from the moment you install or use the app until you uninstall it and stop using it. You may stop at any time by uninstalling MooJot. Uninstalling deletes the app's private storage on that phone, including the ledger, unless Android or a backup you made keeps a copy.

We may change, pause, or stop the app, or ship an update that removes a feature, without owing you damages for that change. The app does not have a remote switch that reaches into your phone and deletes your ledger.

We may update these terms by publishing the new text in the app and in the GitHub repository. The "last updated" date will change. If you keep using the app after that date, you accept the update. If you do not accept it, uninstall the app.

## 15. Force majeure

We are not liable for a failure caused by something outside our reasonable control, including a failure of your phone, Android, Google Play, a bank's slip format, an OCR provider, a network, or a change in the law.

## 16. Disputes and governing law

These terms are governed by the laws of the Kingdom of Thailand, without regard to conflict-of-law rules that would pick another country's law.

Please raise a problem first as an issue on <https://github.com/trajectonomics/moojot/issues>. That request is a courtesy, not a requirement that you give up a claim. If a dispute still needs a court, the courts of Thailand have jurisdiction, except where Thai law gives you a right to sue somewhere else that cannot be waived.

We do not require private arbitration. There is no arbitration provider appointed for this app.

## 17. Other terms

If a court holds one sentence unenforceable, the rest of these terms stay in effect.

These terms, the Privacy Policy, and the MIT License are the whole agreement between you and Trajectonomics about the published app and the source code. They replace earlier statements about those subjects. A marketing line in the app, including "local-first" or "on-device", does not add a warranty. Where a marketing line is shorter than these terms, these terms control.

You may not assign these terms. We may assign them to a person or project that continues MooJot.

A failure to enforce a term once is not a waiver.

## 18. Contact

- Project and issues: <https://github.com/trajectonomics/moojot/issues>
- Security reports: <https://github.com/trajectonomics/moojot/security/advisories/new>
- Privacy Policy: the About section in My Moo, and `docs/privacy-policy.md` in the repository
- Privacy questions and requests: [privacy@trajectonomics.com](mailto:privacy@trajectonomics.com)

Trajectonomics does not publish a postal address for MooJot. Do not send paper notices. Use the links above.
