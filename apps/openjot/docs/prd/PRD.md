# OpenJot — Product Requirements Document (PRD) & Roadmap

**Status:** v0.1 Android MVP Implemented & Verified On-Device
**Stack:** Tauri v2 + Svelte 5 + TypeScript + Tailwind CSS v4 + Rust (`rusqlite` bundled SQLite) + Android Kotlin Native Bridge (`ZXing`, `ML Kit Latin`, `ONNX Runtime Android` + `AksonOCR-Lite`)
**License / Philosophy:** 100% Open Source · 100% Local-First · Every Pro Feature Free · Zero Cloud Uploads · Zero Subscriptions

---

## 1. Product Vision

OpenJot is an open-source, privacy-first personal income & expense tracker built specifically for **Thailand's banking ecosystem** (all 20 Thai banks & e-wallets).

Instead of requiring cloud subscriptions, paid OCR APIs, or external slip-verification servers, OpenJot runs **100% locally on the user's Android device**:
- Reads Thai bank e-slips straight from dedicated bank gallery albums (with a strict 4-layer gatekeeper for opt-in shared albums).
- Decodes Bank of Thailand (BOT) Slip Verify Mini-QR & TrueMoney QR codes locally, runs bundled ML Kit Latin + **4.3 MB Apache-2.0 `AksonOCR-Lite` ONNX** locally for Thai text, attaches the original slip image privately inside the app, detects cross-bank self-transfers automatically, and auto-categorizes expenses offline.

---

## 2. What Is Built & Verified (v0.1 MVP)

### 2.1 Core Ledger & Analytics (`src-tauri/src/`)
- **SQLite WAL Local Database (`db.rs`):**
  - `accounts` (all 20 Thai banks & e-wallets + Cash), `categories` (15 spending + 6 income defaults + unlimited custom categories with icon/color & safe delete/archive), `tags` (unlimited `#tags`), `records` (integer `satang` math, never floats), `record_tags`, `slips` (deduped by SHA-256 + `(sending_bank, trans_ref)` + private `image_path`), `payee_rules`, `budgets`, `recurring_rules`, `app_settings`, `activity_log`.
- **Payday-Cycle Analytics (`analytics.rs`):**
  - Configurable `month_start_day` (1–28) period window.
  - Home day-gutter timeline with daily totals, transfer counts, collapsible Future/Recurring drawer, and dual-streak tracking (sync + categorize).
  - **Summary Donut** (`By Category` & `# By Tag`), **6-Month Compare** bar chart with average baseline, and **Semicircle Budgets** with `Today` pace marker and avg daily spent/left.
  - Free full-history search and **CSV / JSON export** via Android share sheet (`FileProvider`).

### 2.2 100% Local On-Device Slip Scanner & Parser
- **20-Bank Registry (`banks.rs`):** Covers K PLUS, SCB EASY, Krungthai NEXT, Bualuang mBanking, KMA, ttb touch, MyMo by GSB, BAAC A-Mobile, TrueMoney, MAKE by KBank, Kept, KKP, Dime!, UOB TMRW, CIMB THAI, LHB You, TISCO My Wealth, GHB ALL GEN, B-You Max (IBank), and ShopeePay.
- **Hybrid Local OCR (`AksonLocalOcr.kt` + `MooJotScanner.kt`):**
  1. **ZXing** decodes BOT Slip Verify Mini-QR (`00.00=000001`, CRC-16/CCITT-FALSE including SCB 3-char left-padding) & TrueMoney QR (`00.00=01`, `00.01=01`), rejecting PromptPay payment QRs.
  2. **Bundled Google ML Kit Text Recognition v2 (Latin)** extracts English/digits and line bounding boxes.
  3. **`Remtir/AksonOCR-Lite` (`rec.onnx`, 4.3 MB + `rec_charset.json`, 28 KB, Apache-2.0)** runs via `onnxruntime-android` locally (~8 ms/line on CPU) on any garbled/Thai text line — producing exact Thai names with zero cloud calls.
- **Shared Album Privacy Gatekeeper (`MooJotScanner.kt`):**
  - **Default (`Allow Shared Album = OFF`):** Never opens or reads `Pictures/`, `Download/`, `DCIM/`, `Camera/`, or `Screenshots/`. Only scans folders matching enabled bank album keywords.
  - **Opt-In (`Allow Shared Album = ON`):** Still excludes `Camera/` and `Screenshots/`; applies a zero-byte MediaStore metadata pre-filter (portrait aspect ratio `1.15–3.2`, `<= 4 MB`), then enforces a **mandatory BOT / TrueMoney Slip QR check BEFORE OCR or thumbnail saving**.
- **Smart Slip Parser (`slip_parser.rs`, 51 unit tests):**
  - Positional sender/receiver extraction (supports K PLUS label-less, Dime! 2-column, credit card billers, and standard Thai/EN slips).
  - **2-Pass Cross-Bank Self-Transfer Detection (`commands.rs`):** Learns user's own account last-4 digits and sender names across banks + matches configurable `Owner Names` (including surname-initial matching like `MR. SOMCHAI K` ↔ `MR. SOMCHAI KONGDEE`).
  - **Non-Slip Filter:** Automatically skips FX conversions, stock buy/sell order screenshots, and `0.00 Baht` interest notices.
  - **Attached Bank Slips:** Stores a crisp JPEG copy per slip in app-private `files/slips/<sha256>.jpg`, viewable inline inside `RecordSheet` and fullscreen zoomable (`1x`/`2x`) in `SlipLightbox`.

### 2.3 Free Local Auto-Categorizer (`categorizer.rs`, 15 unit tests)
- **247 built-in Thai + English merchant/keyword rules** (food, coffee, BTS/MRT/Rabbit Card, fuel, utilities, telecom, e-commerce, streaming, cinemas, credit card payments, etc.).
- **Learned Payee Memory:** Editing any record's category automatically teaches a high-priority local rule for future slips.
- **Custom Rules UI (`RulesModal.svelte`):** One-tap bulk auto-categorize for uncategorized records + add/delete custom keyword rules.

### 2.4 Native-Feeling Mobile UX (`src/` + `MainActivity.kt`)
- **Two Configurable Color Themes (`theme.ts` + `app.css`):**
  - **Pink & White (Default):** Soft blush-white canvas, white cards, vibrant piggy pink hero & accents.
  - **Black & Orange (Dark Mode):** Obsidian black canvas, charcoal cards, vibrant orange accents.
  - Dynamic Android status bar icon contrast (`setStatusBarLight`) + seamless colored headers extending behind the status bar on Summary, My Moo, Record Detail, Rules, and Search.
- **Interactive 30 FPS Animated Mascot (`MooMascot.svelte`):** Transparent 8-bit alpha animated WebP piggy (`idle`, `scan`, `happy`) overflowing the bottom-right of the Hero Card, reacting to taps, scans, and record saves.
- **Pull-to-Refresh & Hold Scanning** at the top of Home (no duplicate banners).
- **Android Hardware/Gesture Back Navigation (`MainActivity.kt`):** Closes Lightbox → RecordSheet → Rules/Search/Filter → Settings sub-page → returns to Home → double-back exit guard with localized toast.
- **Scroll-Locked Modals:** Background body scroll locked while viewing slip details or zoomed slips.
- **Clean `My Moo` Hub with Sub-Pages (`SettingsView.svelte`):** Organized into Appearance & Theme, Bank Slips & Auto-Scan, Auto-Categorize Rules, Categories & Tags (with 24-icon picker, 8-color picker, and delete), Calendar Settings, and Backup & Local OCR.
- **Full Bilingual Thai / English (`i18n.ts`)** with offline `@fontsource/noto-sans-thai` and built-in calculator numpad (`+ − × ÷ %` + Paste).

---

## 3. Next Steps & Roadmap (Tracked in GitHub Issues)

### Milestone v0.2 — Home UX Polish
1. **Sticky Collapsed Header on Home Scroll:** Pin a compact brand-colored header (`< Nov 26 >`, `Total Spending`, `Summary` pill, Search & Filter icons) seamlessly under the status bar once the Hero Card scrolls out of view.
2. **Distinct Empty-State Illustration:** Replace the duplicate Hero mascot in the `"No records yet"` card with a distinct, lightweight empty-state graphic (e.g., cozy receipt/piggy-bank illustration or sleeping mascot) so the same mascot does not appear twice on empty months.
3. **Swipe-Left to Delete on Record Rows:** Add smooth touch swipe-left gesture on Home timeline rows revealing a red `Delete` action + short Undo snackbar.

### Milestone v0.3 — Credit Card e-Statement PDF Importer
4. **Encrypted PDF Statement Importer:** Local Rust PDF decryption (`lopdf`) + Thai UPC PUA CMap repair + per-issuer parsers (KBank, SCB, KTC, Krungsri, BBL, ttb, UOB, AEON) invoked via Android `ACTION_SEND` (`application/pdf`) or file picker.

### Milestone v1.0 — Public Release & Distribution
5. **Release Pipeline (GitHub Releases APK + Google Play Store):**
   - Release signing keystore setup & GitHub Actions workflow producing signed `arm64-v8a` + universal APK (GitHub Releases) and `.aab` (Play Store).
   - 16 KB page-size alignment verification (NDK r28+), `versionCode`/`versionName` versioning, Play Store Data Safety declaration (local-only `READ_MEDIA_IMAGES` with Android Photo Picker fallback), and Privacy Policy page.
   - Optional v1.0 extras: Biometric App Lock (`tauri-plugin-biometric`), Jetpack Glance home-screen streak/total widget, and daily reminder notifications.

---

## 4. Build & Development Commands

```bash
# Type-check & Svelte diagnostics
bun run check

# Build frontend bundle
bun run build

# Build Android debug APK (requires Android NDK 28+ for 16 KB page alignment)
NDK_HOME=/path/to/Android/Sdk/ndk/28.2.13676358 ANDROID_HOME=/path/to/Android/Sdk \
  bun run tauri android build --apk --debug --target aarch64

# Install debug APK to connected Android device
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```
