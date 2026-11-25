#!/usr/bin/env node
// Regression test for issue #9: a fast horizontal month swipe on the Home list
// must never make the document wider than the viewport.
//
// Zero dependencies: builds the app with Vite, serves build/ with node:http,
// launches headless Chrome and drives it over the Chrome DevTools Protocol
// with Node's built-in WebSocket. Tauri `invoke` is mocked with synthetic data.
//
// Usage:  pnpm test:e2e            (builds first)
//         pnpm test:e2e --no-build (reuse an existing build/)
// Env:    CHROME_BIN=/path/to/chrome   (default: google-chrome / chromium on PATH)
//
// Exit codes: 0 = pass, or skipped because no browser was found; 1 = failure.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { BUILD_DIR, Cdp, buildApp, findChrome, launchChrome, serveBuild, sleep } from "./harness.mjs";

const VIEWPORT = { width: 412, height: 915 };
const SWIPE_ROUNDS = 3;

const log = (...args) => console.log("[month-swipe-width]", ...args);

// ------------------------------------------------------------ tauri mock ---
// Runs in the page before any app script. Synthetic data only.

const TAURI_MOCK = String.raw`(() => {
  const today = new Date();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

  const categories = [
    { id: "cat-food", nameEn: "Food", nameTh: "อาหาร", kind: "spending", icon: "utensils", color: "#f97316", isSystem: true, sortOrder: 1, archived: false },
    { id: "cat-travel", nameEn: "Travel", nameTh: "เดินทาง", kind: "spending", icon: "car", color: "#0ea5e9", isSystem: true, sortOrder: 2, archived: false },
    { id: "cat-salary", nameEn: "Salary", nameTh: "เงินเดือน", kind: "income", icon: "wallet", color: "#22c55e", isSystem: true, sortOrder: 3, archived: false },
  ];
  const accounts = [
    { id: "acc-test", nameEn: "Test Wallet", nameTh: "กระเป๋าทดสอบ", kind: "wallet", bankCode: null, color: "#ff4d94", usesSharedAlbum: false, enabled: true },
  ];
  const settings = {
    language: "en", monthStartDay: 1, weekStartDay: 1, defaultView: "monthly",
    allowSharedAlbum: false, ownerNames: [], aksonOcrApiKey: "", aksonOcrModel: "",
    englishOcrEngine: "mlkit_latin",
  };

  function period(offset) {
    const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { start, end, range: { startDate: iso(start), endDate: iso(end), label: monthNames[start.getMonth()] + " " + start.getFullYear() } };
  }

  function homeData(offset) {
    const p = period(offset);
    const dayGroups = [];
    let total = 0;
    for (let day = Math.min(p.end.getDate(), 20); day >= 1; day -= 1) {
      const date = new Date(p.start.getFullYear(), p.start.getMonth(), day);
      const records = [0, 1].map((i) => {
        const amount = (day * 1000 + i * 2500 + 4500) * 10;
        total += amount;
        return {
          id: "rec-" + iso(date) + "-" + i, kind: "spending", amountSatang: amount, currency: "THB",
          localDate: iso(date), localTime: pad(8 + i * 5) + ":15", accountId: "acc-test",
          categoryId: i === 0 ? "cat-food" : "cat-travel", payeeRaw: "Test Shop " + (i + 1),
          note: null, source: "manual", parseStatus: "ok", isReviewed: true, recurringRuleId: null,
          tagIds: [], slipRef: null, slipQrRaw: null, slipOcrText: null, slipImagePath: null,
          createdAt: iso(date) + "T08:15:00Z",
        };
      });
      dayGroups.push({
        localDate: iso(date), dayOfWeek: dayNames[date.getDay()], dayNumber: day,
        spendingSatang: records.reduce((s, r) => s + r.amountSatang, 0), incomeSatang: 0,
        transferCount: 0, records,
      });
    }
    return {
      period: p.range, totalSpendingSatang: total, totalIncomeSatang: 0, totalTransferSatang: 0,
      remainingSatang: -total, dayGroups, futureRecords: [], futureTotalSatang: 0,
      needsReviewCount: 0, todayJottedCount: 0, syncStreakDays: 0, categorizeStreakDays: 0,
      bestStreakDays: 0,
    };
  }

  function summaryData(offset) {
    return { period: period(offset).range, incomeSatang: 0, spendingSatang: 0, transferSatang: 0,
      remainingSatang: 0, byCategory: [], byTag: [] };
  }

  function compareData(offset, months) {
    const bars = [];
    for (let i = (months ?? 6) - 1; i >= 0; i -= 1) {
      const p = period(offset - i);
      bars.push({ label: p.range.label.slice(0, 3), startDate: p.range.startDate, endDate: p.range.endDate, amountSatang: 0, isCurrent: i === 0 });
    }
    return { bars, averageSatang: 0, currentSatang: 0, deltaVsAverageSatang: 0 };
  }

  const handlers = {
    get_settings: () => settings,
    get_accounts: () => accounts,
    get_categories: () => categories,
    get_tags: () => [],
    list_scanned_months: () => [],
    get_home_data: (a) => homeData(a.periodOffset ?? 0),
    get_summary_data: (a) => summaryData(a.periodOffset ?? 0),
    get_compare_data: (a) => compareData(a.periodOffset ?? 0, a.months),
    get_budgets: () => [],
    get_album_scan_keywords: () => [],
    list_known_slip_media_ids: () => [],
    list_payee_rules: () => [],
  };

  window.__moojotInvokes = [];
  let callbackId = 0;
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args = {}) => {
      window.__moojotInvokes.push(cmd);
      const handler = handlers[cmd];
      return handler ? handler(args) : null;
    },
    transformCallback: (callback, once) => {
      const id = ++callbackId;
      window["_" + id] = (payload) => { if (once) delete window["_" + id]; callback?.(payload); };
      return id;
    },
    unregisterCallback: (id) => { delete window["_" + id]; },
    convertFileSrc: (path) => path,
    metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
  };
})();`;

// ------------------------------------------------------------------- test ---

async function run(chromeBin) {
  const chrome = launchChrome(chromeBin);
  const { server, url } = await serveBuild();
  let cdp;
  try {
    cdp = await Cdp.connect(await chrome.endpoint);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const send = (method, params) => cdp.send(method, params, sessionId);
    const evaluate = async (expression) => {
      const { result, exceptionDetails } = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (exceptionDetails) throw new Error(`Page error: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
      return result.value;
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      ...VIEWPORT,
      deviceScaleFactor: 2.625,
      mobile: true,
    });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await send("Page.addScriptToEvaluateOnNewDocument", { source: TAURI_MOCK });

    const loaded = cdp.waitFor("Page.loadEventFired", sessionId);
    await send("Page.navigate", { url });
    await loaded;

    // Wait for Home to render the synthetic month.
    const deadline = Date.now() + 15000;
    while (!(await evaluate(`document.querySelectorAll("[data-swipe-row]").length`))) {
      if (Date.now() > deadline) {
        const calls = await evaluate(`JSON.stringify(window.__moojotInvokes ?? [])`);
        throw new Error(`Home list never rendered. invoke calls: ${calls}`);
      }
      await sleep(100);
    }

    const measure = () =>
      evaluate(`(() => {
        const moved = [...document.querySelectorAll("main [style*='translate3d']")]
          .map((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          innerWidth: window.innerWidth,
          scrollX: window.scrollX,
          listShift: moved.length ? moved[0] : 0,
        };
      })()`);
    const monthLabel = () =>
      evaluate(`document.querySelector("main")?.innerText.match(/(January|February|March|April|May|June|July|August|September|October|November|December) \\d{4}/)?.[0] ?? null`);

    // A spot on Home where a touch starts a month swipe (not a record row, button or link).
    // Prefer the list (its day gutter), then the header card above it.
    // Wait (at most 300ms) for the previous swipe's snap-back so the spot doesn't move under the finger.
    const startPoint = async (side) => {
      for (let i = 0; i < 30 && (await measure()).listShift !== 0; i += 1) await sleep(10);
      return evaluate(`(() => {
        // Keep a margin around the finger: Chrome's touch adjustment snaps a touch onto a
        // nearby button, and a touch on a record row or button never starts a month swipe.
        const clear = (x, y) => {
          for (const [ox, oy] of [[0, 0], [-24, 0], [24, 0], [0, -24], [0, 24], [-16, -16], [16, -16], [-16, 16], [16, 16]]) {
            const el = document.elementFromPoint(x + ox, y + oy);
            if (!el || !el.closest("main")) return false;
            if (el.closest("[data-swipe-row], button, a, input, label, header, [role=button]")) return false;
          }
          return true;
        };
        const xs = ${side === "left" ? "[24, 32, 40]" : "[388, 380, 372, 364, 356, 348, 340, 332]"};
        const list = document.querySelector("main [style*='translate3d']");
        const listTop = Math.round(Math.max(48, (list?.getBoundingClientRect().top ?? 48) + 24));
        const ys = [];
        for (let y = listTop; y < ${VIEWPORT.height - 140}; y += 6) ys.push(y);
        for (let y = 48; y < listTop; y += 6) ys.push(y);
        for (const y of ys) {
          for (const x of xs) if (clear(x, y)) return { x, y };
        }
        return null;
      })()`);
    };

    const failures = [];
    const samples = [];
    const shiftByDirection = { left: 0, right: 0 };
    const check = async (label) => {
      const m = await measure();
      samples.push({ label, ...m });
      if (m.listShift > 0) shiftByDirection.right = Math.max(shiftByDirection.right, m.listShift);
      if (m.listShift < 0) shiftByDirection.left = Math.max(shiftByDirection.left, -m.listShift);
      // Compare with the phone's width, not innerWidth: mobile Chrome zooms out to fit
      // wider content, which grows innerWidth along with the page.
      const widest = Math.max(m.scrollWidth, m.bodyScrollWidth);
      if (widest > VIEWPORT.width) {
        failures.push(`${label}: scrollWidth ${widest} > viewport ${VIEWPORT.width} (list shift ${m.listShift}px)`);
      }
      if (m.innerWidth !== VIEWPORT.width) {
        failures.push(`${label}: innerWidth is ${m.innerWidth}, expected ${VIEWPORT.width} (page zoomed out to fit wider content)`);
      }
      if (m.scrollX !== 0) failures.push(`${label}: scrollX is ${m.scrollX}, expected 0`);
      return m;
    };
    const trySideScroll = async (label) => {
      const x = await evaluate(`(() => { const y = window.scrollY; window.scrollTo(500, y); const x = window.scrollX; window.scrollTo(0, y); return x; })()`);
      if (x !== 0) failures.push(`${label}: window.scrollTo(500, 0) scrolled the page sideways to scrollX ${x}`);
    };

    const before = await check("before swipes");
    await trySideScroll("before swipes");
    const monthBefore = await monthLabel();
    log(`viewport ${before.innerWidth}px, scrollWidth ${before.scrollWidth}px, month "${monthBefore}"`);

    const touch = (type, x, y) =>
      send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 1, radiusY: 1, force: 1, id: 1 }],
      });

    let swipeCount = 0;
    const swipe = async (direction) => {
      const point = await startPoint(direction === "right" ? "left" : "right");
      if (!point) throw new Error(`No spot on the Home list to start a ${direction} swipe`);
      const name = `swipe ${++swipeCount} (${direction})`;
      const travel = direction === "right" ? 340 : -340;
      await touch("touchStart", point.x, point.y);
      const steps = 6;
      for (let i = 1; i <= steps; i += 1) {
        const x = Math.max(1, Math.min(VIEWPORT.width - 1, point.x + (travel * i) / steps));
        await touch("touchMove", x, point.y + i); // tiny vertical drift, like a real thumb
        await check(`${name}, move ${i}`);
      }
      await trySideScroll(`${name}, mid-gesture`);
      await touch("touchEnd");
      await check(`${name}, right after touchEnd`);
    };

    for (let round = 1; round <= SWIPE_ROUNDS; round += 1) {
      await swipe("left");
      await swipe("right");
      await swipe("right");
      await swipe("left");
    }

    await sleep(500); // let the 180ms snap-back transition and month reload finish
    await check("after swipes settle");
    await trySideScroll("after swipes settle");
    const monthAfterLabel = await monthLabel();

    // Guard against a test that can't fail: the synthetic touches must reach the real handlers.
    for (const [direction, shift] of Object.entries(shiftByDirection)) {
      if (shift < 48) {
        failures.push(`${direction} swipes never moved the list (max shift ${shift}px); touch events did not reach the month swipe handlers`);
      }
    }

    const widest = samples.reduce((a, s) => (Math.max(s.scrollWidth, s.bodyScrollWidth) > Math.max(a.scrollWidth, a.bodyScrollWidth) ? s : a));
    log(`${samples.length} samples over ${SWIPE_ROUNDS * 4} fast swipes; max list shift left ${shiftByDirection.left}px / right ${shiftByDirection.right}px; widest scrollWidth ${Math.max(widest.scrollWidth, widest.bodyScrollWidth)}px (${widest.label})`);
    log(`month label before "${monthBefore}", after "${monthAfterLabel}"`);
    return failures;
  } finally {
    cdp?.close();
    chrome.close();
    server.close();
  }
}

async function main() {
  const chromeBin = findChrome();
  if (!chromeBin) {
    log(
      process.env.CHROME_BIN
        ? `SKIP: CHROME_BIN=${process.env.CHROME_BIN} does not exist.`
        : "SKIP: no Chrome/Chromium found on PATH. Set CHROME_BIN to run this test.",
    );
    return 0;
  }

  if (!process.argv.includes("--no-build") || !existsSync(join(BUILD_DIR, "index.html"))) {
    log("building with vite...");
    if (!buildApp()) {
      log("FAIL: vite build failed");
      return 1;
    }
  }

  log(`browser: ${chromeBin}`);
  const failures = await run(chromeBin);
  if (failures.length) {
    log(`FAIL: the page became wider than the viewport (${failures.length} problems):`);
    for (const f of failures.slice(0, 15)) log(`  - ${f}`);
    if (failures.length > 15) log(`  ... and ${failures.length - 15} more`);
    return 1;
  }
  log("PASS: the page never got wider than the viewport during or after fast month swipes.");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    log(`FAIL: ${error.stack ?? error}`);
    process.exit(1);
  },
);
