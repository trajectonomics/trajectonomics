# Android release

The version lives in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`. The Android `versionName` comes from the Tauri build. `versionCode` is `major * 1000000 + minor * 1000 + patch`, which the Tauri CLI writes to `tauri.properties` (1.0.0 → 1000000, 1.2.0 → 1002000). `build.gradle.kts` falls back to the same formula if that file is missing. It must go up with every release, or Android and Play refuse the update.

## Signing key

Create the keystore once, on a machine you control, outside the repo. Do not commit it.

```bash
mkdir -p ~/moojot-keys && cd ~/moojot-keys
keytool -genkeypair -v \
  -keystore moojot-release.jks \
  -alias moojot \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=MooJot"
```

keytool asks for the password twice. The keystore is PKCS12, so the key uses the same password: `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_PASSWORD` are equal. The certificate name (`-dname`) is public, because anyone can read it from the APK.

The key's file name, alias and `CN=MooJot` predate the rename to OpenJot and never change: the certificate can never change.

**Back up `moojot-release.jks` and its password** (a password manager is fine). Every future update must be signed with this key. If you lose it, people can only install a new version after uninstalling the old one, which deletes their records.

`src-tauri/gen/android/app/build.gradle.kts` signs release builds when these are set. Environment variables win over `keystore.properties`.

| Env | `keystore.properties` |
|---|---|
| `ANDROID_KEYSTORE_PATH` | `storeFile` |
| `ANDROID_KEYSTORE_PASSWORD` | `storePassword` |
| `ANDROID_KEY_ALIAS` | `keyAlias` |
| `ANDROID_KEY_PASSWORD` | `keyPassword` |

`keystore.properties` may live in `src-tauri/gen/android/` or `src-tauri/`. `*.jks`, `*.keystore`, and `keystore.properties` are gitignored.

GitHub Actions secrets for tag builds live in the `openjot-release` environment:

- `ANDROID_KEYSTORE_BASE64` — `base64 -w0 moojot-release.jks`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS` (for example `moojot`)
- `ANDROID_KEY_PASSWORD`

Set them with `gh`. Without `--body`, `gh secret set` asks you to paste the value, so the password never lands in your shell history:

```bash
cd ~/moojot-keys
base64 -w0 moojot-release.jks | gh secret set ANDROID_KEYSTORE_BASE64 -R trajectonomics/trajectonomics --env openjot-release
gh secret set ANDROID_KEY_ALIAS -R trajectonomics/trajectonomics --env openjot-release --body moojot
gh secret set ANDROID_KEYSTORE_PASSWORD -R trajectonomics/trajectonomics --env openjot-release
gh secret set ANDROID_KEY_PASSWORD -R trajectonomics/trajectonomics --env openjot-release
gh secret list -R trajectonomics/trajectonomics --env openjot-release
```

## Build

Use Android NDK r28 or newer so native libraries are 16 KB aligned.

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/28.2.13676358"
bun run tauri android build --apk --target aarch64
bun run tauri android build --aab --target aarch64
```

Check alignment after the build (every `LOAD` segment should be 0x4000 or larger):

```bash
READELF="$NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-readelf"
unzip -q -d /tmp/openjot-apk path/to/app.apk
find /tmp/openjot-apk/lib -name '*.so' -print0 |
  xargs -0 -n1 "$READELF" -l |
  awk '/LOAD/ { if (strtonum($NF) < 16384) bad = 1 } END { exit bad }'
```

## CI

`.github/workflows/openjot.yml` runs on every pull request and every push to `main` that changes `apps/openjot/**` or `bun.lock`. It runs `bun run check`, `bun run test`, `bun run build`, `bun run test:e2e` (headless Chrome) and `cargo test --lib`.

## Third-party notices

The app shows an "Open-source licenses" page (My Moo → About). It displays `static/third-party-notices.txt`, a generated list of everything bundled in the app (Rust crates, web packages, Android libraries, ONNX Runtime, the OCR model and the font) with each copyright notice and license text. MIT, Apache-2.0, BSD and OFL all require those to ship with copies of the software.

**Regenerate it before each release**, and whenever a dependency changes (`Cargo.lock`, `bun.lock`, `build.gradle.kts`):

```bash
bun run tauri android build --apk --target aarch64
node tools/third-party-notices.mjs --apk "$(find src-tauri/gen/android/app/build/outputs/apk -name '*.apk' -path '*release*' | head -n 1)"
```

Use the release APK you are about to ship (the `find` picks Tauri's output; the dry-run APK from `openjot-release` works too). The generator reads the library list from the APK and the lockfiles, downloads each package's license files from crates.io, npm, Maven Central, Google Maven and Hugging Face, and writes the file in the same order every time, so a run with no dependency change leaves no diff. It needs a network, uses only Node built-ins, and keeps a download cache in the temp folder (`--cache <dir>` to move it). `--check` rewrites nothing and fails if the file on disk is out of date.

Commit the regenerated file. `bun run test` fails when `Cargo.lock` or `bun.lock` names a crate or package that the file does not list at that version, and `OPENJOT_APK=<apk> node --test tests/unit/release-apk.test.mjs` fails when the APK bundles a library the file does not list. A new native library, or a library whose POM names an unfamiliar license, stops the generator with a message instead of slipping through.

Google ML Kit and the Google Play services libraries are proprietary (ML Kit Terms of Service). They are listed as such, together with the open-source notices Google ships inside them.

## Releasing

`.github/workflows/openjot-release.yml` builds the arm64 APK and AAB. Before it does, it checks that the versions agree and runs the typecheck and the unit and Rust tests. After the build, it checks 16 KB alignment and runs `tests/unit/release-apk.test.mjs` on the APK, which fails if R8 stripped code that ML Kit or ONNX Runtime needs (#45). Nothing is published when a check fails.

To run that APK check on a build you have locally:

```bash
OPENJOT_APK=path/to/openjot-android-arm64.apk node --test tests/unit/release-apk.test.mjs
```

**Dry run** (publishes nothing): Actions → `openjot-release` → Run workflow, or

```bash
gh workflow run openjot-release.yml --ref main
```

The APK, AAB and `SHA256SUMS` are attached to the run as an artifact for 7 days. Without the keystore secrets the dry-run APK is unsigned, so it won't install until you sign it.

**Publish a release:**

1. Set the same version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`, and merge that change.
2. Tag `main` and push the tag:

   ```bash
   git tag openjot-v1.4.0 origin/main
   git push origin openjot-v1.4.0
   ```

3. The workflow signs the build with the release keystore (it fails if the secrets are missing), checks the signature, and publishes a GitHub Release with:

| Asset | What it is |
|---|---|
| `openjot-android-arm64.apk` | The app, for direct install |
| `openjot-android-arm64.aab` | The Google Play upload |
| `SHA256SUMS` | Checksums of both |

### Stable download links

The asset names don't change between releases, and the Worker picks the newest `openjot-v*` release, so these links always point at it. Use them on the landing page at <https://trajectonomics.com/openjot/>:

- Landing page: `https://trajectonomics.com/openjot/`
- APK: `https://openjot.trajectonomics.com/download`
- Checksums: `https://openjot.trajectonomics.com/download/checksums`
- Release page: `https://github.com/trajectonomics/trajectonomics/releases?q=openjot-v`

The build is arm64 only (`aarch64`), which covers current Android phones.

## Play Store

- Privacy policy: [../privacy-policy.md](../privacy-policy.md)
- Data safety and photo declaration: [play-data-safety.md](play-data-safety.md)
- Store text, settings, declarations and the signing-key choice: [play-listing.md](play-listing.md)
- Upload the `.aab` from the release build. The GitHub Release is the APK channel.
