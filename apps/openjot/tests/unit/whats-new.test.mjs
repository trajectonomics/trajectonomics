import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  CHANGELOG,
  bannerReleases,
  compareVersions,
  latestRelease,
  loadBannerHidden,
  loadWhatsNewSeen,
  releasesToShow,
  saveBannerHidden,
  saveWhatsNewSeen,
} from "../../src/lib/whatsNew.ts";

const versions = (releases) => releases.map((release) => release.version);

test("compareVersions compares numerically, not as text", () => {
  assert.ok(compareVersions("1.10.0", "1.9.0") > 0);
  assert.ok(compareVersions("1.9.0", "1.10.0") < 0);
  assert.ok(compareVersions("2.0.0", "1.99.99") > 0);
  assert.equal(compareVersions("1.3.0", "1.3.0"), 0);
  assert.equal(compareVersions("1.3", "1.3.0"), 0);
  assert.ok(compareVersions("1.2.1", "1.3.0") < 0);
});

test("an update from 1.2.1 shows the 1.3.0 notes", () => {
  const shown = releasesToShow({ lastSeen: "1.2.1", current: "1.3.0", freshInstall: false });
  assert.deepEqual(versions(shown), ["1.3.0"]);
});

test("nothing recorded (an update from 1.2.x) shows every release up to the installed one", () => {
  const releases = [
    { version: "1.5.0", date: "2027-02-01", items: [] },
    { version: "1.4.0", date: "2026-11-24", items: [] },
    { version: "1.3.0", date: "2026-11-24", items: [] },
  ];
  const shown = releasesToShow({ lastSeen: null, current: "1.4.0", freshInstall: false, releases });
  assert.deepEqual(versions(shown), ["1.4.0", "1.3.0"]);
  assert.deepEqual(releasesToShow({ lastSeen: null, current: "1.2.1", freshInstall: false, releases }), []);
});

test("an update from 1.3.0 to 1.4.0 shows only the 1.4.0 notes", () => {
  const shown = releasesToShow({ lastSeen: "1.3.0", current: "1.4.0", freshInstall: false });
  assert.deepEqual(versions(shown), ["1.4.0"]);
});

test("a fresh install shows nothing", () => {
  assert.deepEqual(releasesToShow({ lastSeen: null, current: "1.3.0", freshInstall: true }), []);
});

test("the version already seen shows nothing", () => {
  assert.deepEqual(releasesToShow({ lastSeen: "1.3.0", current: "1.3.0", freshInstall: false }), []);
  assert.deepEqual(releasesToShow({ lastSeen: "1.4.0", current: "1.3.0", freshInstall: false }), []);
});

test("releases newer than the installed version are left out, and skipped ones are all shown", () => {
  const releases = [
    { version: "1.4.0", date: "2027-01-01", items: [] },
    { version: "1.3.0", date: "2026-11-24", items: [] },
    { version: "1.2.5", date: "2026-10-01", items: [] },
    { version: "1.2.0", date: "2026-09-01", items: [] },
  ];
  const shown = releasesToShow({ lastSeen: "1.2.0", current: "1.3.0", freshInstall: false, releases });
  assert.deepEqual(versions(shown), ["1.3.0", "1.2.5"]);
});

test("the newest changelog entry is not older than package.json's version", () => {
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.ok(
    compareVersions(CHANGELOG[0].version, pkg.version) >= 0,
    `package.json is ${pkg.version} but the newest "What's new" entry is ${CHANGELOG[0].version}: add release notes to src/lib/whatsNew.ts`,
  );
});

test("the changelog is newest first, with dates and ids", () => {
  for (let i = 1; i < CHANGELOG.length; i += 1) {
    assert.ok(compareVersions(CHANGELOG[i - 1].version, CHANGELOG[i].version) > 0, "newest first");
  }
  for (const release of CHANGELOG) {
    assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(release.items.length > 0, `${release.version} has items`);
    const ids = release.items.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, `${release.version} has unique item ids`);
  }
});

test("every item has English and Thai text", () => {
  for (const release of CHANGELOG) {
    for (const item of release.items) {
      for (const lang of ["en", "th"]) {
        assert.ok(item.title[lang]?.trim(), `${release.version}/${item.id} title ${lang}`);
        assert.ok(item.body[lang]?.trim(), `${release.version}/${item.id} body ${lang}`);
      }
    }
  }
});

test("without a browser, the seen version loads as null and saving does not throw", () => {
  assert.equal(loadWhatsNewSeen(), null);
  assert.doesNotThrow(() => saveWhatsNewSeen("1.3.0"));
});

test("the banner shows every release up to the installed one that is newer than the closed one", () => {
  const releases = [
    { version: "1.5.0", date: "2027-02-01", items: [] },
    { version: "1.4.0", date: "2026-11-24", items: [] },
    { version: "1.3.0", date: "2026-11-24", items: [] },
  ];
  assert.equal(latestRelease("1.4.0", releases)?.version, "1.4.0");
  assert.equal(latestRelease("1.4.5", releases)?.version, "1.4.0");
  assert.equal(latestRelease("1.2.0", releases), null);

  // Never closed (an update from 1.2.x): everything up to the installed version.
  assert.deepEqual(versions(bannerReleases({ current: "1.4.0", hiddenFor: null, releases })), ["1.4.0", "1.3.0"]);
  // Closed for 1.3.0: only what came after.
  assert.deepEqual(versions(bannerReleases({ current: "1.4.0", hiddenFor: "1.3.0", releases })), ["1.4.0"]);
  // Closed for the installed version: no banner, until a newer release.
  assert.deepEqual(bannerReleases({ current: "1.4.0", hiddenFor: "1.4.0", releases }), []);
  assert.deepEqual(versions(bannerReleases({ current: "1.5.0", hiddenFor: "1.4.0", releases })), ["1.5.0"]);
  // No app version (a plain browser) or no notes for it: no banner.
  assert.deepEqual(bannerReleases({ current: null, hiddenFor: null, releases }), []);
  assert.deepEqual(bannerReleases({ current: "1.2.0", hiddenFor: null, releases }), []);
});

test("seeing the notes does not hide the banner: only closing it does", () => {
  // The banner reads its own key, not the "seen" version that the sheet and the page record.
  assert.equal(bannerReleases({ current: CHANGELOG[0].version, hiddenFor: null })[0]?.version, CHANGELOG[0].version);
});

test("without a browser, the closed banner loads as null and saving does not throw", () => {
  assert.equal(loadBannerHidden(), null);
  assert.doesNotThrow(() => saveBannerHidden("1.3.0"));
});
