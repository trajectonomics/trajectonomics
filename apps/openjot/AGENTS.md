# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/openjot`, the OpenJot Android app (formerly MooJot): Tauri 2 with a SvelteKit 2 frontend, Rust for the app engine, and Kotlin for the Android-native parts. Android comes first; the desktop and iOS targets are not shipped.

## Build and test

Run these from `apps/openjot` unless the command says otherwise.

```bash
bun run dev              # SvelteKit dev server for `bun run tauri dev`
bun run check            # svelte-kit sync, svelte-check, the unit tests and the Vite build
bun run test             # node --test tests/unit/**/*.test.mjs
bun run test:e2e         # the month-swipe width regression (needs CHROME_BIN)
bun run test:screenshots # compares tests/screenshots/baseline; never regenerate a baseline to make a change pass
bun run tauri android build --apk --target aarch64   # the Android build; see docs/release/android.md
```

The Rust tests run in the crate, with an empty `build/` in place because `tauri::generate_context!` reads `frontendDist`:

```bash
mkdir -p build
cd src-tauri && cargo test --lib
```

The landing page's tests are Node tests in `site/`: `cd site && node --test`.

## Rules for this app

1. **Versioning.** The app's `version` in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`, and its `openjot-v<version>` tag, are set by its own release process in [docs/release/android.md](docs/release/android.md), not by `tooling/release` (root rule 6). The three versions must agree before a tag is pushed; `openjot-release.yml` checks that.
2. **Biome and file length are not applied yet.** The app predates the monorepo's Biome config, so `bun run check` here is `svelte-check`, the unit tests and the build, with no Biome step and no file-length rule. A later phase adds Biome with a per-file ratchet; do not add either rule ahead of it, and do not reformat the app to match another package.
3. **Rust.** This is the monorepo's first Rust project. `src-tauri/` keeps its own `Cargo.toml` and `Cargo.lock`, and its own `openjot.yml` job; `cargo` is not part of `bun run check`. Do not add shared Rust crates until a second app needs one.
4. **Code split.** Shared logic (the sync client, the sync format, and the mapping from an OpenJot record to a `traj` transaction) is TypeScript in `packages/core`. App-only logic (the slip parser, categorizer, credit-card statement parser, bank list and database) stays in Rust, and the Android-native parts (OCR, gallery scan, widget, reminders) stay in Kotlin. Do not move app-only logic into the core to share it.
5. **CI.** `.github/workflows/openjot.yml` uses Node 24 and Bun 1.4.4, and runs only when `apps/openjot/**`, `bun.lock` or the workflow itself changes. The Android release is `.github/workflows/openjot-release.yml` on `openjot-v*` tags; it runs in the `openjot-release` environment, which holds the `ANDROID_KEYSTORE_*` secrets and only accepts `main` and `openjot-v*` tags, so a dry run from a branch is refused. Pull request CI never builds the Android app, so after changing anything under `src-tauri/gen/android/app/src/main/res/`, compile the resources before merging: `~/Android/Sdk/build-tools/<version>/aapt2 compile --dir src-tauri/gen/android/app/src/main/res -o "$(mktemp -d -p ~/.cache)/res.zip"`. On 2026-11-27 a `--` inside an XML comment in `widget_bg_traj.xml` (#623) passed every PR check and failed the `openjot-v1.6.0` build.
6. **Names that stay `moojot`.** These are stored on people's phones or in outside systems, so they never change with the product name. A new identifier uses `openjot` instead:
   - The package name is `com.trajectonomics.openjot` (the Gradle `applicationId`, the Google Play app id and, later, the iOS bundle id). It changed once, from `app.moojot.android`, in the first release after 1.6.0, and never changes again. The internal app id `app.moojot.android` stays: the Gradle `namespace`, the Tauri `identifier`, the Kotlin package and its folders, the intent actions (`app.moojot.android.DAILY_REMINDER`, `.WIDGET_ADD`, `.WIDGET_SCAN`), the SharedPreferences names and the app's localStorage keys. Tauri's glue and the Kotlin sources are built around it, and changing any of it would lose settings, records or widget and reminder wiring.
   - The database file `moojot.sqlite3`, and the backup JSON marker `"app": "MooJot"` in `export_backup_json`: restore reads the marker, and every backup keeps the same one.
   - The Rust crate `moojot` and lib `moojot_lib` (`libmoojot_lib.so`): Tauri's Android glue loads the library by that name.
   - Android resource and Kotlin class names (`Theme.moojot`, `ic_stat_moojot`, `MooWidget`, `MooJotScanner`, the `MooJotAndroid` JS bridge and the `moojot:*` window events): a home-screen widget is bound to its provider class, and the WebView glue to the bridge name.
   - The PostHog identity (`$lib: "moojot-site-worker"` and the event names) and the Worker name `moojot-site`: renaming the Worker would create a second Worker that cannot take over the custom domain.
   - The signing key's file (`moojot-release.jks`), alias and `CN=MooJot`: the certificate can never change.
   - `ARCHIVED_REPO = "trajectonomics/moojot"` in `site/release.js`: it is the v1.4.0 download fallback.
7. **Themes and the mascot.** `trajectonomics` is the default theme, built from `@trajectonomics/brand`'s dark Theme (the `--ds-*` roles under `[data-theme="dark"]`, plus Inter). `pink-white` and `orange-black` stay: their CSS blocks never change to fit the default. The saved theme key stays `moojot_theme`; a new theme id maps to its `<html data-theme>` in `src/lib/theme.ts` and the inline script in `src/app.html` follows it.

   The mascot is its own setting, not part of the theme: `robot` or `moo`, saved under the new key `openjot_mascot` by `src/lib/mascot.ts`. Until someone picks one, `loadSavedMascot` derives it from the saved theme (`trajectonomics` → robot, anything else → moo), so an existing install keeps the mascot it had and a new install gets the robot. Every in-app mascot follows it: `MooMascot.svelte` and `EmptyMonthArt.svelte` read `activeMascot` from `src/lib/themeStore.ts`. The robot poses are copied from `apps/site/public/mascot/` into `static/mascot/robot/` so the offline app bundles them; the Moo poses are in `static/mascot/`.

   The Android launcher icon and the home-screen widget's mascot image follow the same setting. The manifest declares two activity-aliases, `.LauncherRobot` (robot art, enabled in the manifest) and `.LauncherMoo` (Moo art, disabled), and `MascotIcon.kt` switches them. `MainActivity.onStop` applies the icon, because changing the enabled alias of the running task can close the app on some Android versions; the JS bridge's `setMascot` only stores the choice and redraws the widget, which picks `widget_mascot_robot` or `widget_mascot` in `MooWidget.kt`.
8. **Never test the live short links with a browser user agent.** A GET to `trajectonomics.com/openjot/go/…` or `/openjot/download…` is counted in PostHog as a real click or download unless `tracking.js` sees a bot: HEAD requests, an empty user agent and the `BOT` pattern (which matches curl's default user agent) are skipped, a phone or browser user agent is not. Test the Worker with `node --test` in `site/` or `npx wrangler@4 dev`, and check a live redirect with plain `curl -I`. On 2026-11-26 an agent's check with an Android user agent counted one fake `/go/ig` click.
