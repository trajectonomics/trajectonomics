# Play Console — store listing and declarations

Text and answers for the Google Play listing (#35), ready to paste. They only claim what the app does today. Check them against `docs/privacy-policy.md` and [play-data-safety.md](play-data-safety.md) before each submission. Play's limits: name 30 characters, short description 80, full description 4000.

## Store listing

Default language: Thai (th-TH). Add English (en-US) as a translation.

### Thai (th-TH)

**App name:** OpenJot จดรายจ่ายจากสลิป

**Short description:** อ่านสลิปธนาคารไทยแล้วจดรายจ่ายให้เอง ในมือถือคุณ ฟรี ไม่ต้องสมัคร ไม่มีโฆษณา

**Full description:**

```text
OpenJot อ่านสลิปที่แอปธนาคารบันทึกไว้ในมือถือ แล้วจดรายจ่ายพร้อมแยกหมวดให้เอง ไม่ต้องสมัคร ไม่มีโฆษณา ฟรีทุกฟีเจอร์

มูทำอะไรได้บ้าง
• อ่านสลิปได้ 20 แอปธนาคารและวอลเล็ต เช่น K PLUS, SCB EASY, Krungthai NEXT, MAKE และ TrueMoney อ่าน QR บนสลิป และข้อความภาษาไทยและอังกฤษในเครื่อง
• แยกหมวดให้เอง มีกฎร้านค้าในตัว 247 ข้อ ตั้งแต่ 7-Eleven ถึง BTS แก้หมวดครั้งเดียว มูจำไว้ใช้ครั้งหน้า
• รู้ว่าเป็นการโอนเข้าบัญชีตัวเอง จึงไม่นับเป็นรายจ่ายซ้ำ
• สรุปตามหมวดหรือแท็ก เทียบย้อนหลัง 6 เดือน และงบที่บอกว่ายังใช้ได้อีกวันละเท่าไหร่
• นำเข้า e-Statement บัตรเครดิต (PDF ที่ล็อกรหัส) ของ KBank, SCB, KTC, Krungsri, BBL, ttb, UOB และ AEON
• ส่งออก CSV หรือ JSON ได้ตลอด ใช้ได้ทั้งไทยและอังกฤษ เลือกธีมชมพูขาวหรือดำส้ม

ความเป็นส่วนตัว
• บัญชีรายรับรายจ่ายเก็บในมือถือคุณ ไม่มีบัญชีผู้ใช้ และไม่มีเซิร์ฟเวอร์ของ OpenJot ที่เก็บรายการของคุณ
• ค่าเริ่มต้นอ่านเฉพาะอัลบั้มสลิปของแอปธนาคาร ไม่เปิดรูปจากกล้อง ภาพหน้าจอ หรือโฟลเดอร์ดาวน์โหลด
• สถิติการใช้งานแบบไม่ระบุตัวตนปิดไว้ จนกว่าคุณจะเปิดเอง และไม่มีรายการหรือยอดเงินของคุณ
• การอ่านข้อความภาษาอังกฤษบนสลิปใช้ ML Kit ของ Google ซึ่งส่งสถิติการใช้งานของตัวเองให้ Google (ไม่ส่งรูปหรือข้อความในสลิป)

โอเพนซอร์ส
โค้ดของ OpenJot เปิดให้ดูได้ทุกบรรทัด ภายใต้สัญญาอนุญาต MIT: https://github.com/trajectonomics/trajectonomics/tree/main/apps/openjot

OpenJot ไม่มีส่วนเกี่ยวข้องกับธนาคารหรือวอลเล็ตใด ชื่อธนาคารและชื่อแอปเป็นของเจ้าของแต่ละราย
```

### English (en-US)

**App name:** OpenJot: Slip Expense Tracker

**Short description:** Reads Thai bank slips and logs every expense on your phone. Free, no sign-up.

**Full description:**

```text
OpenJot reads the payment slips your banking apps save to your phone, then logs and sorts every expense for you. No sign-up, no ads, every feature free.

What Moo can do
• Reads slips from 20 banking and wallet apps, including K PLUS, SCB EASY, Krungthai NEXT, MAKE and TrueMoney: the slip QR, plus the Thai and English text, read on your phone
• Sorts itself: 247 built-in merchant rules, from 7-Eleven to BTS. Fix a category once and Moo remembers it
• Spots transfers between your own accounts, so they aren't counted as spending
• Summaries by category or tag, a 6-month comparison, and budgets that show what you can still spend per day
• Imports password-protected credit card e-statements (PDF) from KBank, SCB, KTC, Krungsri, BBL, ttb, UOB and AEON
• Export to CSV or JSON any time. Thai or English, pink and white or black and orange

Private by design
• Your ledger is stored on your phone. There's no OpenJot account, and no OpenJot server holds your records
• By default it reads only your banking apps' slip albums, never your camera photos, screenshots or downloads
• Anonymous usage stats are off until you turn them on, and never include your records or amounts
• To read English text on slips, OpenJot uses Google ML Kit, which sends Google its own usage metrics (not your photos or their text)

Open source
OpenJot's code is open source under the MIT license: https://github.com/trajectonomics/trajectonomics/tree/main/apps/openjot

OpenJot isn't affiliated with any bank or e-wallet. Bank and app names belong to their owners.
```

### Graphics

- App icon (512×512): resize `static/app-icon.png`.
- Feature graphic (1024×500): export [play-feature-graphic.svg](play-feature-graphic.svg) to PNG.
- Phone screenshots: see "Listing assets" in [play-data-safety.md](play-data-safety.md). Use sample data only, never a real ledger.

## Store settings

| Field | Value |
|---|---|
| App or game | App |
| Developer name | Trajectonomics |
| Category | Finance |
| Tags | Budgeting, expense tracking (pick the closest ones Play offers) |
| Website | https://trajectonomics.com/openjot/ |
| Email | privacy@trajectonomics.com |
| Privacy policy | https://github.com/trajectonomics/trajectonomics/blob/main/apps/openjot/docs/privacy-policy.md |

The developer account is a personal account named Trajectonomics. New personal accounts must run a closed test with 12 testers for 14 days before production (trajectonomics/trajectonomics#568).

## App content declarations

| Declaration | Answer |
|---|---|
| Privacy policy | The URL above |
| Ads | No, the app has no ads |
| App access | All functionality is available without special access. There is no login |
| Content rating | Fill the IARC questionnaire as a utility app with no violence, sexual content, gambling, user-to-user communication, location sharing or purchases. Expect the lowest rating |
| Target audience | 18 and over. The terms say OpenJot is for adults. Don't choose any age under 13, so the Families policy doesn't apply |
| News app | No |
| Government app | No |
| Health apps | No health features |
| Financial features | OpenJot tracks spending the user records. It does not offer banking, payments, loans, investing, insurance or crypto. Pick the personal-finance / budgeting option, or "no financial features" if Play has no such option |
| Advertising ID | No. The app doesn't use it, and the release APK doesn't request `com.google.android.gms.permission.AD_ID` |
| Data safety | [play-data-safety.md](play-data-safety.md) |
| Photo and video permissions | [play-data-safety.md](play-data-safety.md#photo-and-video-permissions) |

## Release

Upload `openjot-android-arm64.aab` from the GitHub release.

When Play Console sets up Play App Signing, choose to **use your own app signing key** and upload the existing `moojot-release.jks` key (Play Console shows the export steps, using its PEPK tool). Play then signs with the same certificate as the GitHub APK (`CN=MooJot`, the app's earlier name, which predates the rename and never changes; SHA-256 `be15a0f5…5041a3a1`). The landing page promises that every release is signed with that key, and it lets people move between the GitHub APK and Play without uninstalling. If Play generates its own key instead, a GitHub install has to be uninstalled before the Play version can be installed, and uninstalling deletes the records. This choice can't be undone later.
