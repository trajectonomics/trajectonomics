---
title: "OpenJot vs MeowJot: a side-by-side look at two Thai bank-slip expense trackers"
description: "Both OpenJot and MeowJot read payment slips from 20 Thai banking apps. Here is how they differ on price, sign-up, privacy, credit card statements, CSV export and platform support."
type: compare
products: [openjot]
publishedOn: 2026-11-28
cover:
  src: /blog/posts/openjot-vs-meowjot/cover.webp
  alt: "Two Android phone screens side by side on a dark background — MeowJot on the left and OpenJot highlighted in orange on the right — under the title OpenJot vs MeowJot and kicker COMPARE · OPENJOT"
  width: 1024
  height: 1024
---

> **Checked on 24 Nov 2026** — MeowJot's pricing and feature details below were read from [meowjot.com](https://www.meowjot.com/pricing) on 23 Nov 2026 and checked inside the MeowJot Android app on 24 Nov 2026. OpenJot details match [apps/openjot](https://github.com/trajectonomics/trajectonomics/tree/main/apps/openjot).

[OpenJot](https://trajectonomics.com/openjot/) (formerly MooJot) and [MeowJot (เหมียวจด)](https://www.meowjot.com/pricing) solve the same daily problem in Thailand: you pay by QR or bank transfer, your banking app saves an e-slip photo, and the tracker reads that slip so you do not have to type every expense by hand.

Both read slips from **20 Thai banking and wallet apps**. The difference is the model behind them: **MeowJot**, by KASIKORN X (KBTG group), is a freemium iOS and Android app with cloud backup tied to your phone number; **OpenJot**, by Trajectonomics, is a free, open-source Android app with no user account, no paid tier, and a ledger that stays on your phone.

<figure>
  <img src="/blog/posts/openjot-vs-meowjot/summary-comparison.webp" alt="Side-by-side Android screenshots from the same phone and same month of bank slips: MeowJot free plan on the left showing one grey Spending slice, and OpenJot on the right splitting spending into categories with personal details and amounts blurred" width="1200" height="1020" loading="lazy" />
  <figcaption>Same Android phone, same month, same bank slips (captured 24 Nov 2026; amounts blurred). Left: MeowJot free plan groups the month into one "Spending" slice because automatic categories require Silver. Right: OpenJot splits categories for free. MeowJot's in-app artwork belongs to KASIKORN X.</figcaption>
</figure>

## Side-by-side comparison

| Topic | OpenJot | MeowJot (เหมียวจด) |
| --- | --- | --- |
| **Price** | Free, every feature; no ads | Free basic · Silver 79 ฿/mo or 499 ฿/yr · Gold 149 ฿/mo or 799 ฿/yr (14-day trial) |
| **Sign-up** | None; no user account | Mobile number + SMS code |
| **Where data lives** | SQLite on your phone; no OpenJot server | Backed up with MeowJot, tied to your phone number |
| **Switching phones** | Export a backup file yourself (restore still being built) | Sign in on the new phone and records follow |
| **Banking apps read** | [20 apps](https://trajectonomics.com/openjot/) | [20 apps](https://www.meowjot.com/guides/supported-banks) |
| **Slip lookback** | This month, 3 months, or 1 year (while slips remain in albums) | [7 to 30 days](https://www.meowjot.com/guides/start-using-meowjot), depending on the bank |
| **History you can see** | Unlimited | 1 month on Free · unlimited on Silver+ |
| **Automatic categories** | Free (247 built-in merchant rules; remembers your fixes) | Silver+ (500,000+ store database) |
| **Budgets** | Free, with daily allowance (budget alerts planned) | Silver+, with alerts |
| **Recurring records** | Free | Silver+ |
| **Spending trends** | Free (6-month comparison) | Silver+ |
| **Yearly & quarterly view** | Not yet (planned) | Silver+ |
| **Custom month start** | Free | Silver+ |
| **Tags (`#`)** | Unlimited, free | Free: 1 · Silver: 5 · Gold: 100 |
| **Custom categories** | Unlimited, free | Gold: up to 50 |
| **Credit card statements** | Free (PDF e-statements from 8 Thai issuers) | Gold |
| **Data export** | CSV and JSON, free | CSV on Gold |
| **Themes** | Trajectonomics dark, pink, or black & orange — free | Gold |
| **Platforms** | Android 7.0+ (64-bit APK; Google Play planned) | [iOS](https://apps.apple.com/app/meowjot-auto-track-expenses/id6475871215) and [Android](https://play.google.com/store/apps/details?id=tech.kbtg.meowjot) |
| **Open source** | Yes ([AGPL-3.0-only](https://github.com/trajectonomics/trajectonomics/blob/main/apps/openjot/LICENSE)) | No |
| **Made by** | Trajectonomics | KASIKORN X (KBTG group) |

## What the pricing adds up to

On MeowJot's [in-app plan screen](https://www.meowjot.com/pricing) (checked 24 Nov 2026), the free tier covers basic slip reading, 1 month of visible history, and 1 tag. If you want unlimited history, automatic categories, budgets, recurring records, and custom month cycles, you need **Silver**; if you want credit card statement import, custom categories, or CSV export, you need **Gold**.

| Plan | Monthly billing (1 year) | Annual billing (1 year) | Annual billing (3 years) |
| --- | --- | --- | --- |
| **OpenJot** | 0 ฿ | 0 ฿ | 0 ฿ |
| **MeowJot Free** | 0 ฿ *(1-month history, 1 tag)* | 0 ฿ | 0 ฿ |
| **MeowJot Silver** | 948 ฿ *(79 ฿ × 12)* | 499 ฿ | 1,497 ฿ |
| **MeowJot Gold** | 1,788 ฿ *(149 ฿ × 12)* | 799 ฿ | 2,397 ฿ |

<figure>
  <img src="/blog/posts/openjot-vs-meowjot/plans-and-budget.webp" alt="Left: MeowJot in-app plan comparison screen showing Free, Silver and Gold tiers at 149 baht per month or 799 baht per year for Gold. Right: OpenJot budget screen with sample data showing a monthly gauge and remaining daily allowance" width="1200" height="1020" loading="lazy" />
  <figcaption>Left: MeowJot's in-app plan comparison screen (24 Nov 2026). Right: OpenJot's monthly budget screen with daily allowance (sample data), available free with no upgrade gate.</figcaption>
</figure>

## Privacy and where your ledger lives

- **MeowJot** requires a mobile number and SMS verification, and backs up your ledger to its servers under [KASIKORN X's privacy policy](https://www.meowjot.com/privacy-policy). The upside is convenience: sign in on a new phone and your history comes back automatically.
- **OpenJot** has no account and no server that stores your ledger. Records, slip photos, and PDF statement imports stay in local SQLite storage on your phone, and OCR runs on-device (a QR decoder, Google ML Kit Latin for English text, and AksonOCR-Lite ONNX for Thai text). As documented in [OpenJot's privacy policy](https://github.com/trajectonomics/trajectonomics/blob/main/apps/openjot/docs/privacy-policy.md), Google ML Kit still sends Google its own diagnostic metrics (such as device model and app version, never slip images or recognized text), and anonymous app usage statistics are off until you switch them on.

## Which one is for you?

**Pick OpenJot if you…**

- want budgets, tags, credit card e-statements, and CSV/JSON export without a subscription;
- prefer not to register a phone number or store your spending ledger on a company server;
- want to scan up to 1 year of existing bank slips in one go;
- use Android and are comfortable [installing an APK](/blog/guides/install-moojot-on-android/) until the Google Play listing lands.

**Pick MeowJot if you…**

- use an iPhone (OpenJot is Android-only for now);
- want to install straight from the App Store or Google Play today;
- want automatic cloud backup when switching phones;
- want budget alerts, yearly/quarterly views, and a 500,000+ store database right now;
- prefer an app backed by a major Thai bank group.

## Frequently asked questions

**Can I switch from MeowJot to OpenJot?**
OpenJot does not import files from other apps yet, but you often will not need to: choose **1 year** when scanning your banking apps' slip albums and OpenJot rebuilds your history from the slips already on your phone.

**Is OpenJot affiliated with MeowJot or KBank?**
No. OpenJot is an independent open-source project by Trajectonomics and is not affiliated with or endorsed by MeowJot, KASIKORN X, KBTG, or any bank.

**Where can I see the full interactive comparison or download OpenJot?**
Visit [trajectonomics.com/openjot/meowjot-alternative](https://trajectonomics.com/openjot/meowjot-alternative/) for the full visual breakdown, or [trajectonomics.com/openjot](https://trajectonomics.com/openjot/) to download the latest signed Android APK and verify its `SHA256SUMS`.

## Sources

- [meowjot.com/pricing](https://www.meowjot.com/pricing) (checked 23 Nov 2026)
- [meowjot.com/guides/supported-banks](https://www.meowjot.com/guides/supported-banks)
- [meowjot.com/guides/start-using-meowjot](https://www.meowjot.com/guides/start-using-meowjot)
- [meowjot.com/privacy-policy](https://www.meowjot.com/privacy-policy)
- MeowJot Android app: plans, plan comparison, and account screens (checked 24 Nov 2026)
- [OpenJot source code and privacy policy](https://github.com/trajectonomics/trajectonomics/tree/main/apps/openjot)

*MeowJot and เหมียวจด are trademarks of their owner. OpenJot is not affiliated with or endorsed by MeowJot, KASIKORN X, or any bank.*
