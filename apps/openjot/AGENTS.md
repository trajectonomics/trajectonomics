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
5. **CI.** `.github/workflows/openjot.yml` uses Node 24 and Bun 1.4.4, and runs only when `apps/openjot/**`, `bun.lock` or the workflow itself changes. The Android release is `.github/workflows/openjot-release.yml` on `openjot-v*` tags; it runs in the `openjot-release` environment, which holds the `ANDROID_KEYSTORE_*` secrets.
6. **Names that stay `moojot`.** These are stored on people's phones or in outside systems, so they never change with the product name. A new identifier uses `openjot` instead:
   - The app id `app.moojot.android`: the Gradle `namespace`, the Tauri `identifier`, the Kotlin package and its folders, the intent actions (`app.moojot.android.DAILY_REMINDER`, `.WIDGET_ADD`, `.WIDGET_SCAN`), the SharedPreferences names and the app's localStorage keys. Changing any of them would lose settings, records or widget and reminder wiring.
   - The database file `moojot.sqlite3`, and the backup JSON marker `"app": "MooJot"` in `export_backup_json`: restore reads the marker, and every backup keeps the same one.
   - The Rust crate `moojot` and lib `moojot_lib` (`libmoojot_lib.so`): Tauri's Android glue loads the library by that name.
   - Android resource and Kotlin class names (`Theme.moojot`, `ic_stat_moojot`, `MooWidget`, `MooJotScanner`, the `MooJotAndroid` JS bridge and the `moojot:*` window events): a home-screen widget is bound to its provider class, and the WebView glue to the bridge name.
   - The PostHog identity (`$lib: "moojot-site-worker"` and the event names) and the Worker name `moojot-site`: renaming the Worker would create a second Worker that cannot take over the custom domain.
   - The signing key's file (`moojot-release.jks`), alias and `CN=MooJot`: the certificate can never change.
   - `ARCHIVED_REPO = "trajectonomics/moojot"` in `site/release.js`: it is the v1.4.0 download fallback.
7. **Theme.** The app's colours and its Latin font come from `@trajectonomics/brand` ([`packages/brand`](../../packages/brand/AGENTS.md)): `src/app.css` imports the brand's light and dark Theme CSS and maps the app's own `--bg-*` and `--brand-*` names onto the `--ds-*` roles. The choice is still stored under the localStorage key `moojot_theme`; `migrateTheme` in `src/lib/theme.ts` maps the retired `pink-white`/`orange-black` values to `light`/`dark`, so never change the key.
