#!/usr/bin/env node
// Generates static/third-party-notices.txt: the copyright notices and license texts of everything
// bundled in the OpenJot APK, read from the lockfiles, the brand package's font assets and the
// built release APK (not typed by hand).
//
//   node tools/third-party-notices.mjs --apk path/to/openjot-android-arm64.apk
//
// Options:
//   --apk <file>     the release APK to inventory (required)
//   --out <file>     where to write (default static/third-party-notices.txt)
//   --cache <dir>    download cache (default <tmp>/openjot-notices-cache); safe to delete
//   --check          write nothing; exit 1 if the file on disk differs from what would be generated
//
// It downloads crate, npm and Maven archives from the public registries, so it needs a network
// the first time. It adds no dependency to the app: only Node built-ins are used.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readZip, readTarGz } from "./archive.mjs";
import { download, mapLimit, cached } from "./fetch-cache.mjs";
import { compareVersions, loadArtifact, scanArchive } from "./maven.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT = join(ROOT, "static", "third-party-notices.txt");

// Pinned sources outside the lockfiles. Changing a pin changes the output on purpose.
const SPDX_LIST_TAG = "v3.27.0";
const AKSON_REPO = "Remtir/AksonOCR-Lite";
const AKSON_REVISION = "576fa7b148b628656eb6fb70917d3e8c488bab3d";
const LLVM_TAG = "llvmorg-19.1.7";

// npm packages that Vite/SvelteKit/Tailwind put into (or generate into) the frontend bundle
// although they are devDependencies. Their license obligations ship with the app.
const BUNDLED_DEV_PACKAGES = ["@sveltejs/kit", "tailwindcss"];

// Native libraries that may sit in the APK, and what covers each. An unknown library fails the
// run, so a new native dependency cannot slip into a release without a notice.
export const NATIVE_LIBS = {
  "libmoojot_lib.so": "OpenJot's Rust library: the crates listed below, with SQLite statically linked",
  "libonnxruntime.so": "ONNX Runtime",
  "libonnxruntime4j_jni.so": "ONNX Runtime",
  "libmlkit_google_ocr_pipeline.so": "Google ML Kit (proprietary)",
  "libc++_shared.so": "LLVM libc++",
};

// --- small helpers --------------------------------------------------------------------------

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const norm = (text) => text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();

/** A line that names a copyright holder ("Copyright (c) 2020 Foo", "(C) Foo", "© Foo"). */
const COPYRIGHT_LINE = /^\s*(?:[*#/>]+\s*)?(?:(?:Copyright|COPYRIGHT)\s*(?:\(c\)|\(C\)|©)?\s*(?:\d|[A-Z<])|(?:\(c\)|\(C\)|©)\s*\d|©\s*[A-Z])/;
const isCopyrightLine = (line) => COPYRIGHT_LINE.test(line) && !/<year>|<copyright holders?>|\byyyy\b/i.test(line);

const copyrightLines = (text) =>
  norm(text)
    .split("\n")
    .filter(isCopyrightLine)
    .map((l) => l.replace(/^\s*(?:[*#/>]+\s*)/, "").replace(/\s+/g, " ").trim());

/** The license wording without its copyright lines, whitespace-collapsed: the grouping key. */
const bodyKey = (text) =>
  norm(text)
    .split("\n")
    .filter((l) => !isCopyrightLine(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, cache: join(tmpdir(), "openjot-notices-cache"), check: false, apk: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") args.check = true;
    else if (a === "--apk") args.apk = argv[++i];
    else if (a === "--out") args.out = resolve(argv[++i]);
    else if (a === "--cache") args.cache = resolve(argv[++i]);
    else throw new Error(`unknown option ${a}\nusage: node tools/third-party-notices.mjs --apk <apk> [--out file] [--cache dir] [--check]`);
  }
  if (!args.apk) throw new Error("--apk <path to the release APK> is required");
  return args;
}

const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// --- standard license texts (only for components whose package ships none) --------------------

const standardCache = new Map();
async function standardText(cacheDir, id) {
  if (!standardCache.has(id)) {
    standardCache.set(
      id,
      cached(cacheDir, `spdx/${SPDX_LIST_TAG}/${id}`, async () => {
        const data = await download(`https://raw.githubusercontent.com/spdx/license-list-data/${SPDX_LIST_TAG}/text/${id}.txt`);
        return data ? { text: data.toString("utf8") } : { text: null };
      }).then((r) => r.text),
    );
  }
  return standardCache.get(id);
}

/** Fills the SPDX template's holder placeholders; returns null when SPDX has no text for `id`. */
async function renderStandard(cacheDir, id, holder) {
  const text = await standardText(cacheDir, id);
  if (!text) return null;
  return norm(text)
    .replace(/^.*<copyright holders?>.*$/gim, (line) => (isTemplateCopyright(line) ? `Copyright (c) ${holder}` : line))
    .replace(/<year>/g, "")
    .replace(/<copyright holders?>/g, holder)
    .replace(/<owner>/g, holder)
    .replace(/<organization>/g, holder);
}
const isTemplateCopyright = (line) => /copyright/i.test(line);

const PERMISSIVE_SPDX = /^(MIT|MIT-0|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|ISC|Zlib|Unlicense|0BSD|CC0-1\.0|MPL-2\.0|Unicode-3\.0|BSL-1\.0|OFL-1\.1|CDLA-Permissive-2\.0)$/;

function spdxIds(expression) {
  return [...new Set((expression.match(/[A-Za-z0-9.+-]+/g) ?? []).filter((t) => !["OR", "AND", "WITH"].includes(t) && PERMISSIVE_SPDX.test(t)))];
}

// --- Rust crates ----------------------------------------------------------------------------

const CRATE_LICENSE_FILE = /^(licen[sc]e|licence|copying|notice|unlicense|copyright|patents)([-_. ].*)?$/i;
// A file named like a license but holding code or data (license.rs, license.json) is not a notice.
const NOT_A_NOTICE = /\.(m?[jt]s|cjs|d\.ts|rs|json|map|py|c|h|cpp|html?|css|svelte|toml|yml|yaml)$/i;
const isNoticeFile = (name) => CRATE_LICENSE_FILE.test(name) && !NOT_A_NOTICE.test(name);

async function rustComponents(cacheDir, warnings) {
  const lock = read("src-tauri/Cargo.lock");
  const crates = [];
  for (const block of lock.split("[[package]]").slice(1)) {
    const name = /^name = "(.*)"$/m.exec(block)?.[1];
    const version = /^version = "(.*)"$/m.exec(block)?.[1];
    // The workspace's own crate has no `source`; it is OpenJot itself.
    if (name && version && /^source = /m.test(block)) crates.push({ name, version });
  }
  const loaded = await mapLimit(crates, 12, ({ name, version }) =>
    cached(cacheDir, `crates-v2/${name}-${version}`, async () => {
      const gz = await download(`https://static.crates.io/crates/${name}/${name}-${version}.crate`);
      if (!gz) throw new Error(`crate ${name} ${version} not found on crates.io`);
      const prefix = `${name}-${version}/`;
      const files = readTarGz(gz, (path) => {
        if (!path.startsWith(prefix)) return false;
        const rel = path.slice(prefix.length);
        const parts = rel.split("/");
        if (rel === "Cargo.toml") return true;
        if (parts.length > 4 || parts.some((s) => /^(tests?|examples?|benches|node_modules|target|\.github|fuzz)$/i.test(s))) return false;
        return isNoticeFile(parts.at(-1));
      });
      return files.map((f) => ({ path: f.path.slice(prefix.length), text: f.data.toString("utf8") }));
    }),
  );
  const out = [];
  for (let i = 0; i < crates.length; i++) {
    const { name, version } = crates[i];
    const files = loaded[i];
    const toml = files.find((f) => f.path === "Cargo.toml")?.text ?? "";
    const pkg = /^\[package\]([\s\S]*?)(?:^\[|(?![\s\S]))/m.exec(toml)?.[1] ?? toml;
    const license = /^license\s*=\s*"(.*)"/m.exec(pkg)?.[1] ?? (/^license-file\s*=/m.test(pkg) ? "see license file" : "UNKNOWN");
    const authors = [...(/^authors\s*=\s*\[([\s\S]*?)\]/m.exec(pkg)?.[1] ?? "").matchAll(/"([^"]*)"/g)].map((m) => m[1].replace(/\s*<[^>]*>/, "").trim()).filter(Boolean);
    const repository = /^repository\s*=\s*"(.*)"/m.exec(pkg)?.[1] ?? null;
    const texts = files.filter((f) => f.path !== "Cargo.toml" && f.text.trim()).map((f) => ({ text: f.text }));
    out.push({
      eco: "rust",
      name,
      version,
      license,
      url: repository,
      texts,
      fallback: texts.length ? null : { ids: spdxIds(license), holder: authors.length ? authors.join(", ") : `the ${name} authors${repository ? ` (${repository})` : ""}` },
    });
  }
  return out;
}

// --- npm packages ---------------------------------------------------------------------------

/** bun.lock is JSON with trailing commas and `//` comments. */
function parseBunLock(text) {
  const json = text
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(json);
}

/** A package key's parent scope: "@scope/name" has none, "parent/@scope/name" is "parent". */
function parentKey(key, name) {
  if (key === name) return "";
  const suffix = `/${name}`;
  return key.endsWith(suffix) ? key.slice(0, -suffix.length) : "";
}

/** The packages in bun.lock, keyed by their install path, with the names and versions they resolve to. */
function bunPackages(lock) {
  const packages = new Map();
  for (const [key, value] of Object.entries(lock.packages ?? {})) {
    const id = value[0];
    const at = id.lastIndexOf("@");
    const meta = value[2] && typeof value[2] === "object" ? value[2] : {};
    packages.set(key, {
      name: id.slice(0, at),
      version: id.slice(at + 1),
      dependencies: meta.dependencies ?? {},
      optionalDependencies: meta.optionalDependencies ?? {},
      peerDependencies: meta.peerDependencies ?? {},
      optionalPeers: meta.optionalPeers ?? [],
    });
  }
  return packages;
}

/** A direct dependency of a workspace: nested under it when bun had to, otherwise hoisted. */
function resolveDirect(packages, workspace, name) {
  const nested = `${workspace}/${name}`;
  if (packages.has(nested)) return nested;
  return packages.has(name) ? name : null;
}

/** A package's dependency: the nearest nested copy, walking up to the hoisted one. */
function resolveDependency(packages, key, name) {
  const pkg = packages.get(key);
  const candidates = [`${key}/${name}`];
  let scope = parentKey(key, pkg.name);
  while (scope) {
    candidates.push(`${scope}/${name}`);
    const parent = packages.get(scope);
    if (!parent) break;
    scope = parentKey(scope, parent.name);
  }
  candidates.push(name);
  return candidates.find((candidate) => packages.has(candidate)) ?? null;
}

/** Direct production packages, their transitive production closure, and the bundled dev packages. */
export function npmPackageList(lockText = read("../../bun.lock"), workspace = "apps/openjot") {
  const lock = parseBunLock(lockText);
  const packages = bunPackages(lock);
  const root = lock.workspaces?.[workspace];
  if (!root) throw new Error(`bun.lock has no ${workspace} workspace`);
  const found = new Map();
  const queue = [];
  const add = (key) => {
    const pkg = packages.get(key);
    if (!pkg) throw new Error(`bun.lock has no package ${key}`);
    if (found.has(`${pkg.name}@${pkg.version}`)) return;
    found.set(`${pkg.name}@${pkg.version}`, { name: pkg.name, version: pkg.version });
    queue.push(key);
  };
  const direct = Object.keys(root.dependencies ?? {});
  for (const name of direct) {
    const key = resolveDirect(packages, root.name, name);
    if (!key) throw new Error(`bun.lock does not resolve ${name} from ${workspace}`);
    add(key);
  }
  while (queue.length) {
    const key = queue.shift();
    const pkg = packages.get(key);
    const deps = [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.optionalDependencies),
      ...Object.keys(pkg.peerDependencies).filter((name) => !pkg.optionalPeers.includes(name)),
    ];
    for (const name of deps) {
      const depKey = resolveDependency(packages, key, name);
      if (depKey) add(depKey);
    }
  }
  for (const name of BUNDLED_DEV_PACKAGES) {
    if (!(name in (root.devDependencies ?? {}))) {
      throw new Error(`${name} is listed as bundled but is not a devDependency in bun.lock`);
    }
    const key = resolveDirect(packages, root.name, name);
    if (!key) throw new Error(`bun.lock does not resolve ${name} from ${workspace}`);
    add(key);
  }
  return { direct, packages: [...found.values()].sort((a, b) => cmp(a.name, b.name) || cmp(a.version, b.version)) };
}

/** The resolved version of each direct production dependency of a workspace. */
export function directDependencyVersions(lockText = read("../../bun.lock"), workspace = "apps/openjot") {
  const lock = parseBunLock(lockText);
  const packages = bunPackages(lock);
  const root = lock.workspaces?.[workspace];
  if (!root) throw new Error(`bun.lock has no ${workspace} workspace`);
  const resolved = {};
  for (const name of Object.keys(root.dependencies ?? {})) {
    const key = resolveDirect(packages, root.name, name);
    const pkg = key ? packages.get(key) : null;
    if (!pkg) throw new Error(`bun.lock does not resolve ${name} from ${workspace}`);
    resolved[name] = pkg.version;
  }
  return resolved;
}

async function npmComponents(cacheDir) {
  const { packages } = npmPackageList();
  const loaded = await mapLimit(packages, 8, ({ name, version }) =>
    cached(cacheDir, `npm-v2/${name}-${version}`, async () => {
      const base = name.replace(/^@[^/]+\//, "");
      const gz = await download(`https://registry.npmjs.org/${name}/-/${base}-${version}.tgz`);
      if (!gz) throw new Error(`npm package ${name}@${version} not found`);
      const files = readTarGz(gz, (path) => {
        const parts = path.split("/");
        // The top folder is "package" for almost every tarball, but not for all of them.
        if (parts.length === 2 && parts[1] === "package.json") return true;
        return parts.length <= 3 && !parts.includes("node_modules") && isNoticeFile(parts.at(-1));
      });
      return files.map((f) => ({ path: f.path, text: f.data.toString("utf8") }));
    }),
  );
  return packages.map(({ name, version }, i) => {
    const files = loaded[i];
    const pkg = JSON.parse(files.find((f) => /^[^/]+\/package\.json$/.test(f.path)).text);
    const license = typeof pkg.license === "string" ? pkg.license : pkg.license?.type ?? (pkg.licenses ?? []).map((l) => l.type).join(" OR ") ?? "UNKNOWN";
    const author = typeof pkg.author === "string" ? pkg.author.replace(/\s*[<(].*$/, "") : pkg.author?.name;
    const texts = files.filter((f) => !/^[^/]+\/package\.json$/.test(f.path) && f.text.trim()).map((f) => ({ text: f.text }));
    const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
    return {
      eco: "npm",
      name,
      version,
      license: license || "UNKNOWN",
      url: repo ? repo.replace(/^git\+/, "").replace(/\.git$/, "") : null,
      texts,
      fallback: texts.length ? null : { ids: spdxIds(license), holder: author || `the ${name} authors` },
    };
  });
}

// --- brand typefaces --------------------------------------------------------------------------

const BRAND_FONT_ASSETS = resolve(ROOT, "../../packages/brand/brands/trajectonomics/assets/fonts");
const BRAND_CURRENT_FONTS = resolve(ROOT, "../../packages/brand/dist/current/fonts");

// The OFL text that ships with each brand family the app bundles. A woff2 file carries no
// package metadata, so the license cannot be read from the file itself; a family with no entry
// here fails the run instead of shipping without its notice. The texts name the copyright holder.
const BRAND_FONT_LICENSES = {
  "Azeret Mono": "AZERET-MONO-OFL-1.1.txt",
  "Inter Variable": "INTER-OFL-1.1.txt",
};

/** The @font-face rules in a stylesheet: the family each declares and the woff2 files it loads. */
function fontFaces(css) {
  return [...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map(([, body]) => ({
    family: /font-family:\s*["']([^"']+)["']/.exec(body)?.[1] ?? null,
    files: [...body.matchAll(/url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/g)].map((m) => m[1].split("/").pop()),
  }));
}

/**
 * The typefaces the app bundles from @trajectonomics/brand, a private devDependency that no
 * registry serves. The app's own stylesheet says which brand sheets it imports and declares the
 * faces for the fonts copied into static/fonts/, so this follows the app rather than a hand-kept
 * inventory: a new subset, or a woff2 in static/fonts/ with no face, fails the run.
 */
export function brandFontComponents() {
  const appCss = read("src/app.css");
  const families = new Map(); // font-family -> Set(woff2 file name)
  const add = (face) => {
    if (!face.family) throw new Error("an @font-face in the app's styles has no font-family");
    if (!face.files.length) return; // a metric-matched fallback face loads no file
    const files = families.get(face.family) ?? new Set();
    for (const file of face.files) files.add(file);
    families.set(face.family, files);
  };
  for (const [, sheet] of appCss.matchAll(/@import\s+["']@trajectonomics\/brand\/current\/fonts\/([^"']+\.css)["']/g)) {
    const path = join(BRAND_CURRENT_FONTS, sheet);
    if (!existsSync(path)) {
      throw new Error(`${path} is missing: build the brand package first (bunx turbo run build --filter=@trajectonomics/brand)`);
    }
    for (const face of fontFaces(readFileSync(path, "utf8"))) {
      for (const file of face.files) {
        if (!existsSync(join(BRAND_CURRENT_FONTS, file))) throw new Error(`${path} loads ${file}, which is not in the package`);
      }
      add(face);
    }
  }
  for (const face of fontFaces(appCss)) {
    for (const file of face.files) {
      if (!existsSync(join(ROOT, "static", "fonts", file))) throw new Error(`src/app.css loads /fonts/${file}, which is not in static/fonts`);
    }
    add(face);
  }
  const declared = new Set([...families.values()].flatMap((files) => [...files]));
  for (const file of readdirSync(join(ROOT, "static", "fonts"))) {
    if (file.endsWith(".woff2") && !declared.has(file)) {
      throw new Error(`static/fonts/${file} has no @font-face in src/app.css, so it would ship without a notice`);
    }
  }
  const out = [];
  for (const family of [...families.keys()].sort(cmp)) {
    const license = BRAND_FONT_LICENSES[family];
    if (!license) {
      throw new Error(`the app bundles the brand typeface "${family}", which has no license in BRAND_FONT_LICENSES`);
    }
    const licensePath = join(BRAND_FONT_ASSETS, license);
    if (!existsSync(licensePath)) throw new Error(`${licensePath} is missing: it is the notice for the "${family}" font`);
    const files = [...families.get(family)].sort(cmp);
    for (const file of files) {
      if (!existsSync(join(BRAND_FONT_ASSETS, file))) throw new Error(`the "${family}" face loads ${file}, which is not a brand asset`);
    }
    out.push({
      eco: "npm",
      name: `${family} (${files.join(", ")})`,
      version: "bundled",
      license: "OFL-1.1",
      url: null,
      texts: [{ text: readFileSync(licensePath, "utf8") }],
      fallback: null,
      // Printed in full in its own Part 2 group: the OFL body repeats "Copyright ..." lines that
      // are not copyright notices, and grouping by body would drop them from the reproduced text.
      verbatim: true,
    });
  }
  return out;
}

// --- Android libraries ------------------------------------------------------------------------

/** Reads the libraries the APK itself names: META-INF/*.version and the root *.properties files. */
export function apkArtifacts(zip) {
  const versioned = [];
  const clients = [];
  for (const name of zip.names) {
    let m;
    if ((m = /^META-INF\/([^/]+)\.version$/.exec(name))) {
      const stem = m[1];
      const version = zip.read(name).toString("utf8").trim();
      // A few AndroidX files hold a Gradle task message instead of a version; the POMs give theirs.
      if (!/^\d/.test(version)) continue;
      if (stem.startsWith("kotlinx_")) {
        versioned.push({ group: "org.jetbrains.kotlinx", artifact: stem.replaceAll("_", "-"), version });
      } else {
        const us = stem.indexOf("_");
        versioned.push({ group: stem.slice(0, us), artifact: stem.slice(us + 1), version });
      }
    } else if ((m = /^([^/]+)\.properties$/.exec(name))) {
      const props = Object.fromEntries(
        zip
          .read(name)
          .toString("utf8")
          .split(/\r?\n/)
          .filter((l) => l.includes("=") && !l.startsWith("#"))
          .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
      );
      if (props.client && props.version) clients.push({ artifact: props.client, version: props.version });
    }
  }
  versioned.sort((a, b) => cmp(a.group, b.group) || cmp(a.artifact, b.artifact));
  clients.sort((a, b) => cmp(a.artifact, b.artifact));
  return { versioned, clients };
}

// Google publishes ML Kit, Play services, Firebase and the data transport under several groups;
// the APK's properties files only carry the artifact name.
const CLIENT_GROUPS = ["com.google.mlkit", "com.google.android.gms", "com.google.firebase", "com.google.android.datatransport", "com.google.android.odml"];

function directGradleDeps(text) {
  return [...text.matchAll(/^\s*implementation\("([^":]+):([^":]+):([^"]+)"\)/gm)].map((m) => ({ group: m[1], artifact: m[2], version: m[3] }));
}

/** The Android library Tauri ships inside the `tauri` crate declares its own dependencies. */
async function tauriAndroidDeps(cacheDir) {
  const lock = read("src-tauri/Cargo.lock");
  const m = /name = "tauri"\nversion = "([^"]+)"/.exec(lock);
  if (!m) return [];
  const file = await cached(cacheDir, `tauri-android-gradle/${m[1]}`, async () => {
    const gz = await download(`https://static.crates.io/crates/tauri/tauri-${m[1]}.crate`);
    const files = readTarGz(gz, (p) => p === `tauri-${m[1]}/mobile/android/build.gradle.kts`);
    return { text: files[0]?.data.toString("utf8") ?? "" };
  });
  return directGradleDeps(file.text);
}

// Tauri's Android library excludes org.json:json (the platform provides org.json), so it is not bundled.
const EXCLUDED_ANDROID = new Set(["org.json:json"]);

const GOOGLE_PROPRIETARY = /^(com\.google\.mlkit|com\.google\.android\.gms|com\.google\.firebase|com\.google\.android\.datatransport|com\.google\.android\.odml)$/;

function classifyLicense(pomLicenses, group) {
  const names = pomLicenses.map((l) => l.name ?? l.url ?? "").filter(Boolean);
  const spdx = new Set();
  let proprietary = false;
  for (const l of pomLicenses) {
    const s = `${l.name ?? ""} ${l.url ?? ""}`;
    if (/apache/i.test(s)) spdx.add("Apache-2.0");
    else if (/\bMIT\b|opensource\.org\/licenses\/MIT/i.test(s)) spdx.add("MIT");
    else if (/BSD.?3|3.clause/i.test(s)) spdx.add("BSD-3-Clause");
    else if (/BSD.?2|2.clause/i.test(s)) spdx.add("BSD-2-Clause");
    else proprietary = true;
  }
  if (!pomLicenses.length && GOOGLE_PROPRIETARY.test(group)) proprietary = true;
  return { names, spdx: [...spdx], proprietary };
}

const GOOGLE_TERMS = "Proprietary - Google ML Kit Terms of Service (https://developers.google.com/ml-kit/terms) / Android SDK License (https://developer.android.com/studio/terms)";

async function androidComponents(cacheDir, apkZip, warnings) {
  const { versioned, clients } = apkArtifacts(apkZip);
  const locked = new Map(); // "group:artifact" -> version, as the APK reports it
  for (const v of versioned) locked.set(`${v.group}:${v.artifact}`, v.version);

  // The APK's *.properties files name only the artifact: find the group that publishes it.
  for (const c of clients) {
    let group = null;
    for (const g of CLIENT_GROUPS) {
      if (await loadArtifact(cacheDir, g, c.artifact, c.version, { withBinary: false })) {
        group = g;
        break;
      }
    }
    if (!group) throw new Error(`cannot find ${c.artifact} ${c.version} (named by the APK) on Google Maven`);
    locked.set(`${group}:${c.artifact}`, c.version);
  }

  const roots = new Map(locked);
  const direct = [...directGradleDeps(read("src-tauri/gen/android/app/build.gradle.kts")), ...(await tauriAndroidDeps(cacheDir))];
  const kotlin = /"buildPluginVersion":\s*"([^"]+)"/.exec(apkZip.read("kotlin-tooling-metadata.json")?.toString("utf8") ?? "")?.[1];
  if (kotlin) direct.push({ group: "org.jetbrains.kotlin", artifact: "kotlin-stdlib", version: kotlin });
  const merge = (map, key, version) => {
    const have = map.get(key);
    if (have === undefined || (!locked.has(key) && compareVersions(version, have) > 0)) map.set(key, version);
  };
  for (const d of direct) merge(roots, `${d.group}:${d.artifact}`, d.version);

  // Closure over the POMs' runtime dependencies; the highest version wins, the APK's own wins over all.
  let want = new Map(roots);
  for (let round = 0; round < 12; round++) {
    const next = new Map(roots);
    const entries = [...want];
    const infos = await mapLimit(entries, 8, async ([key, version]) => {
      const [g, a] = key.split(":");
      return loadArtifact(cacheDir, g, a, version, { withBinary: false });
    });
    entries.forEach(([key, version], i) => {
      if (!infos[i]) {
        warnings.push(`no POM for ${key}:${version}`);
        return;
      }
      for (const d of infos[i].deps) if (!EXCLUDED_ANDROID.has(`${d.g}:${d.a}`)) merge(next, `${d.g}:${d.a}`, d.v);
    });
    const same = next.size === want.size && [...next].every(([k, v]) => want.get(k) === v);
    want = next;
    if (same) break;
  }

  const keys = [...want.keys()].sort();
  const infos = await mapLimit(keys, 6, async (key) => {
    const [g, a] = key.split(":");
    return loadArtifact(cacheDir, g, a, want.get(key), { withBinary: !g.startsWith("androidx.") });
  });
  const out = [];
  keys.forEach((key, i) => {
    const info = infos[i];
    const [g, a] = key.split(":");
    const version = want.get(key);
    if (!info) {
      warnings.push(`no POM for ${key}:${version}; listed without license data`);
      out.push({ eco: "android", name: key, version, license: "UNKNOWN (no POM found)", texts: [], fallback: null });
      return;
    }
    const { names, spdx, proprietary } = classifyLicense(info.licenses, g);
    const holder = info.organization ?? (info.developers.length ? info.developers.join(", ") : null) ?? `the ${a} authors`;
    const texts = info.files.filter((f) => f.text.trim()).map((f) => ({ text: f.text, title: f.title ?? null }));
    const hasFullText = (id) => texts.some((t) => (id === "Apache-2.0" ? /Apache License[\s\S]*Version 2\.0/.test(t.text) : id === "MIT" ? /Permission is hereby granted/.test(t.text) : t.text.length > 600));
    const needStandard = spdx.filter((id) => !hasFullText(id));
    const component = {
      eco: "android",
      name: key,
      version,
      license: proprietary
        ? GOOGLE_PROPRIETARY.test(g)
          ? GOOGLE_TERMS
          : `${names.join("; ") || "UNKNOWN"} (not recognised as open source; review)`
        : spdx.join(" AND ") || "UNKNOWN",
      url: info.url ?? info.scm,
      texts,
      fallback: needStandard.length ? { ids: needStandard, holder } : null,
      proprietary,
    };
    if (proprietary && !GOOGLE_PROPRIETARY.test(g)) warnings.push(`${key}:${version} has a license that is not recognised as open source: ${names.join("; ") || "none declared"}`);
    if (!proprietary && !spdx.length) warnings.push(`${key}:${version} declares no license in its POM`);
    out.push(component);
  });
  return out;
}

// --- native libraries, model, app ---------------------------------------------------------------

async function nativeComponents(cacheDir, apkZip, android, warnings) {
  const libs = [...new Set(apkZip.names.filter((n) => /^lib\/[^/]+\/[^/]+\.so$/.test(n)).map((n) => n.split("/").pop()))].sort();
  const unknown = libs.filter((l) => !NATIVE_LIBS[l]);
  if (unknown.length) throw new Error(`native libraries without a notice rule: ${unknown.join(", ")}. Add them to NATIVE_LIBS in tools/third-party-notices.mjs.`);
  const out = [];
  const ort = android.find((c) => c.name === "com.microsoft.onnxruntime:onnxruntime-android");
  if (libs.some((l) => NATIVE_LIBS[l] === "ONNX Runtime")) {
    if (!ort) throw new Error("the APK has ONNX Runtime libraries but onnxruntime-android was not resolved");
    // GitHub is not needed: the desktop jar of the same release carries ONNX Runtime's ThirdPartyNotices.txt.
    const r = await cached(cacheDir, `maven-onnxruntime-notices/${ort.version}`, async () => {
      const data = await download(`https://repo1.maven.org/maven2/com/microsoft/onnxruntime/onnxruntime/${ort.version}/onnxruntime-${ort.version}.jar`);
      const hit = data ? scanArchive(data).find((f) => /(^|\/)ThirdPartyNotices\.txt$/.test(f.path)) : null;
      return { text: hit?.text ?? null };
    });
    if (!r.text) warnings.push(`ONNX Runtime ${ort.version}: ThirdPartyNotices.txt not found in the onnxruntime jar`);
    const holder = "Microsoft Corporation";
    out.push({
      eco: "native",
      name: `ONNX Runtime native libraries (${libs.filter((l) => NATIVE_LIBS[l] === "ONNX Runtime").join(", ")})`,
      version: ort.version,
      license: "MIT, with the third-party components listed in ONNX Runtime's ThirdPartyNotices.txt",
      url: "https://onnxruntime.ai/",
      texts: r.text ? [{ text: r.text, title: "ONNX Runtime ThirdPartyNotices.txt" }] : [],
      fallback: { ids: ["MIT"], holder },
    });
  }
  if (libs.includes("libc++_shared.so")) {
    const r = await cached(cacheDir, `github/llvm-${LLVM_TAG}/libcxx-LICENSE`, async () => {
      const data = await download(`https://raw.githubusercontent.com/llvm/llvm-project/${LLVM_TAG}/libcxx/LICENSE.TXT`);
      return { text: data ? data.toString("utf8") : null };
    });
    if (!r.text) warnings.push("libcxx LICENSE.TXT not found");
    out.push({ eco: "native", name: "LLVM libc++ (libc++_shared.so)", version: LLVM_TAG.replace("llvmorg-", ""), license: "Apache-2.0 WITH LLVM-exception", url: "https://libcxx.llvm.org/", texts: r.text ? [{ text: r.text }] : [], fallback: null });
  }
  out.push({
    eco: "native",
    name: "SQLite (statically linked into libmoojot_lib.so through the libsqlite3-sys crate)",
    version: "bundled",
    license: "Public domain (https://sqlite.org/copyright.html); the libsqlite3-sys binding is MIT and is listed under Rust crates",
    url: "https://sqlite.org/",
    texts: [],
    fallback: null,
  });
  return out;
}

async function modelComponents(cacheDir, warnings) {
  const fetchFile = async (file) => {
    const r = await cached(cacheDir, `huggingface/${AKSON_REPO.replace("/", "_")}-${AKSON_REVISION}/${file}`, async () => {
      const data = await download(`https://huggingface.co/${AKSON_REPO}/resolve/${AKSON_REVISION}/${file}`);
      return { text: data ? data.toString("utf8") : null };
    });
    if (!r.text) warnings.push(`Hugging Face ${AKSON_REPO}@${AKSON_REVISION.slice(0, 7)} has no ${file}`);
    return r.text;
  };
  const [notice, license] = await Promise.all([fetchFile("NOTICE"), fetchFile("LICENSE")]);
  return [
    {
      eco: "model",
      name: "AksonOCR-Lite Thai/English text-line recognizer (rec.onnx, rec_charset.json)",
      version: `Hugging Face ${AKSON_REPO} @ ${AKSON_REVISION.slice(0, 7)}`,
      license: "Apache-2.0 (fine-tuned from PaddlePaddle PP-OCRv6_tiny_rec, also Apache-2.0)",
      url: `https://huggingface.co/${AKSON_REPO}`,
      texts: [notice, license].filter(Boolean).map((text) => ({ text })),
      fallback: null,
    },
  ];
}

function appComponent() {
  const pkg = JSON.parse(read("package.json"));
  return { eco: "app", name: "OpenJot", version: pkg.version, license: "AGPL-3.0-only", url: "https://github.com/trajectonomics/trajectonomics/tree/main/apps/openjot", texts: [{ text: read("LICENSE") }], fallback: null };
}

// --- rendering ----------------------------------------------------------------------------------

const ECOSYSTEMS = [
  ["app", "OpenJot", []],
  ["rust", "Rust crates (compiled into libmoojot_lib.so)", ["Tauri's Android glue library (app.tauri.*, in classes.dex) is part of the tauri crate listed here."]],
  ["npm", "Web app packages (bundled into the app's JavaScript, CSS and fonts)", [
    "@fontsource/noto-sans-thai provides the Noto Sans Thai font files under the SIL Open Font License 1.1.",
    "Inter Variable and Azeret Mono are bundled from the workspace's private @trajectonomics/brand package, which ships them under the SIL Open Font License 1.1.",
  ]],
  ["android", "Android and Java/Kotlin libraries (classes.dex and resources)", ["The Google ML Kit and Google Play services libraries are proprietary; the open-source notices they ship are reproduced in Part 2."]],
  ["native", "Native libraries", []],
  ["model", "OCR model", []],
];

async function resolveFallbacks(cacheDir, components, warnings) {
  for (const c of components) {
    if (!c.fallback) continue;
    const { ids, holder } = c.fallback;
    let added = 0;
    for (const id of ids) {
      const text = await renderStandard(cacheDir, id, holder);
      if (text) {
        c.texts.push({ text, standard: id });
        added++;
      }
    }
    c.usedFallback = true;
    if (!added) warnings.push(`${c.eco} ${c.name} ${c.version}: no license text available (license "${c.license}")`);
  }
}

function buildGroups(components) {
  const groups = new Map(); // bodyKey -> { variants: Map(normText -> text), members: [] }
  for (const c of components) {
    c.refs = new Set();
    for (const t of c.texts) {
      const text = norm(t.text);
      if (!text) continue;
      // A verbatim component's text gets its own group, printed whole: grouping it by body would
      // replace every line the copyright heuristic matches, which for the OFL includes terms.
      const key = c.verbatim ? Symbol("verbatim") : bodyKey(text);
      let group = groups.get(key);
      if (!group) groups.set(key, (group = { variants: new Map(), members: [] }));
      if (!group.variants.has(text)) group.variants.set(text, text);
      group.members.push({ component: c, copyrights: copyrightLines(text), standard: t.standard ?? null, holder: c.fallback?.holder ?? null, title: t.title ?? null });
      c.refsGroup ??= [];
      c.refsGroup.push(group);
    }
  }
  [...groups.values()].forEach((g, i) => (g.id = i + 1));
  return [...groups.values()];
}

const wrap = (text, width = 100, indent = "") => {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if (line && (indent + line + " " + w).length > width) {
      lines.push(indent + line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(indent + line);
  return lines.join("\n");
};

const RULE = "=".repeat(78);
const THIN = "-".repeat(78);

export function render(components, warnings = []) {
  const groups = buildGroups(components);
  const counts = Object.fromEntries(ECOSYSTEMS.map(([eco]) => [eco, components.filter((c) => c.eco === eco).length]));
  for (const c of components) if (c.eco === "rust" && /MPL-2\.0/.test(c.license) && !/OR/.test(c.license) && !/cssparser|dtoa-short|option-ext|selectors/.test(c.name)) warnings.push(`MPL-2.0 crate ${c.name} is not named in the header note; update it`);
  const out = [];
  out.push(
    "OPENJOT THIRD-PARTY NOTICES",
    RULE,
    "",
    wrap("OpenJot is free software under the GNU Affero General Public License v3.0 only (AGPL-3.0-only), and it is the first entry below. It also contains software from other projects. This file lists each component with its version and license, and reproduces the copyright notices and license texts that those licenses ask us to pass on."),
    "",
    wrap("Google ML Kit (on-device text recognition) and the Google Play services libraries it uses are NOT open source. Google provides them under the ML Kit Terms of Service (https://developers.google.com/ml-kit/terms) and the Android Software Development Kit License (https://developer.android.com/studio/terms). OpenJot's AGPL-3.0-only license covers OpenJot's own source code, not those libraries."),
    "",
    wrap("Where several components share one license text, the text is printed once and each component is listed with its own copyright notice(s). Licenses written as \"A OR B\" let the recipient choose; every text shipped with the component is included. The standard (SPDX) license text is used only where a component's package ships none, and the copyright holder then comes from the package metadata."),
    "",
    wrap("Components under the Mozilla Public License 2.0 (cssparser, cssparser-macros, dtoa-short, option-ext, selectors) are used unmodified, exactly as published on crates.io; their source code is available there, and from the repository named in each crate's metadata. The same applies to every other component: it is used as published by its project, and its source is available from the registry it was obtained from (crates.io, npmjs.com, Maven Central or Google Maven)."),
    "",
    wrap("An asterisk (*) after a component marks one whose package ships no license file: the standard text of its license is printed instead, with the copyright holder taken from the package metadata."),
    "",
    wrap("This file is generated, not edited by hand. To regenerate it after a dependency change, build the release APK and run: node tools/third-party-notices.mjs --apk path/to/openjot-android-arm64.apk (see docs/release/android.md)."),
    "",
    `Components: ${counts.rust} Rust crates, ${counts.npm} web packages, ${counts.android} Android/Java libraries, ${counts.native} native-library entries, ${counts.model} model, plus OpenJot itself.`,
    "",
    RULE,
    "PART 1. COMPONENTS",
    RULE,
    wrap("Each line: name, version, license, and the numbers of the license texts in Part 2 (written L1, L2, ...)."),
  );
  for (const [eco, title, notes] of ECOSYSTEMS) {
    const list = components.filter((c) => c.eco === eco);
    if (!list.length) continue;
    out.push("", THIN, `${title} - ${list.length}`, THIN);
    for (const note of notes) out.push(wrap(note), "");
    for (const c of list) {
      const ids = [...new Set((c.refsGroup ?? []).map((g) => g.id))];
      const refs = ids.length > 8 ? `[${ids.length} notices, see Part 2]` : ids.length ? `[${ids.map((id) => `L${id}`).join(", ")}]` : "";
      out.push(wrap(`${c.name} ${c.version}${c.usedFallback ? " *" : ""} - ${c.license}${refs ? ` ${refs}` : ""}`, 100).replace(/\n/g, "\n    "));
    }
  }

  out.push("", RULE, "PART 2. LICENSE TEXTS AND NOTICES", RULE);
  for (const g of groups) {
    const variants = [...g.variants.values()];
    out.push("", THIN, `L${g.id}`, THIN);
    const members = new Map(); // "name version" -> { copyrights:Set }
    for (const m of g.members) {
      const label = `${m.component.name} ${m.component.version}`;
      const entry = members.get(label) ?? { copyrights: new Set(), titles: new Set() };
      if (m.title) entry.titles.add(m.title);
      for (const line of m.copyrights) entry.copyrights.add(line);
      if (m.standard && m.holder) entry.copyrights.add(m.standard === "Apache-2.0" ? `Copyright ${m.holder}` : `Copyright (c) ${m.holder}`);
      members.set(label, entry);
    }
    const single = variants.length === 1;
    out.push(`Applies to (${members.size}):`);
    for (const [label, entry] of [...members].sort((a, b) => cmp(a[0], b[0]))) {
      const extra = single ? [] : [...entry.copyrights].sort();
      const titles = [...entry.titles].sort();
      out.push(`  ${label}${titles.length ? ` (notice for ${titles.join("; ")})` : ""}${extra.length ? `: ${extra.join(" | ")}` : ""}`);
    }
    out.push("");
    if (single) out.push(variants[0]);
    else {
      let placed = false;
      const body = variants[0]
        .split("\n")
        .flatMap((line) => {
          if (!isCopyrightLine(line)) return [line];
          if (placed) return [];
          placed = true;
          return ["[Copyright notice(s): see the list above for each component.]"];
        })
        .join("\n");
      out.push(body);
    }
  }
  out.push("");
  return out.join("\n");
}

// --- main ----------------------------------------------------------------------------------------

export async function generate({ apk, cache }) {
  const warnings = [];
  mkdirSync(cache, { recursive: true });
  const apkZip = readZip(readFileSync(apk));
  const [rust, npm, android, model] = await Promise.all([rustComponents(cache, warnings), npmComponents(cache), androidComponents(cache, apkZip, warnings), modelComponents(cache, warnings)]);
  const native = await nativeComponents(cache, apkZip, android, warnings);
  const components = [appComponent(), ...[...rust, ...npm, ...android, ...native, ...model].sort((a, b) => ECOSYSTEMS.findIndex(([e]) => e === a.eco) - ECOSYSTEMS.findIndex(([e]) => e === b.eco) || cmp(a.name, b.name) || cmp(a.version, b.version)), ...brandFontComponents()];
  await resolveFallbacks(cache, components, warnings);
  return { text: render(components, warnings), components, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const { text, components, warnings } = await generate(args);
  for (const w of [...new Set(warnings)].sort()) console.error(`warning: ${w}`);
  const fallbacks = components.filter((c) => c.usedFallback);
  console.error(`standard text used for ${fallbacks.length} components: ${fallbacks.map((c) => `${c.name}@${c.version}`).join(", ")}`);
  if (args.check) {
    const current = existsSync(args.out) ? readFileSync(args.out, "utf8") : "";
    if (current !== text) {
      console.error(`${args.out} is out of date. Regenerate it: node tools/third-party-notices.mjs --apk <apk>`);
      process.exit(1);
    }
    console.error("third-party notices are up to date");
  } else {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, text);
    console.error(`wrote ${args.out} (${Buffer.byteLength(text)} bytes)`);
  }
}
