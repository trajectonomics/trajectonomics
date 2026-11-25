// The fake backend for screenshot scenes. `pageFixture` runs inside the page
// before any app script: it pins the clock, sets the saved preferences and
// replaces Tauri's `invoke` with fixed, synthetic data, so every run draws the
// same pixels. Nothing here is real financial data.
//
// It is serialised with Function.prototype.toString, so it must not use
// anything from this module's scope.

/** The moment every scene believes it is: Wednesday 18 March 2026, 12:00 in Bangkok. */
export const FIXED_NOW = "2026-03-18T12:00:00+07:00";
export const TIMEZONE = "Asia/Bangkok";

/**
 * @param {object} options
 * @param {"en" | "th"} [options.lang]
 * @param {"light" | "dark"} [options.theme]
 * @param {"left" | "right"} [options.hand]
 * @param {"full" | "empty"} [options.data] "empty" is a month with no records.
 * @param {"done" | "pending"} [options.onboarding] "pending" opens the first-run tour.
 * @param {"granted" | "denied"} [options.android] Adds a fake Android bridge with photo access
 *   granted or not. Scans it is asked to start are recorded in `window.__moojotScans`.
 * @param {boolean} [options.appLock] The app lock (#79) is on. Android's unlock prompt answers
 *   "cancelled", so the app stays on its lock card. Needs `android`.
 * @param {boolean} [options.reminder] The daily reminder (#80) is on, at 20:30.
 * @param {string} [options.appVersion] The app version the fake backend reports. Default "1.1.0".
 * @param {string | null} [options.whatsNewSeen] The version "What's new" (#104) was last shown for:
 *   a version string, or `null` for "never recorded". By default it is the app version, so no
 *   scene shows the sheet unless it asks to.
 * @param {boolean} [options.feedbackCard] The one-time feedback card (#90) is due: two
 *   successful scans since 14 March, neither used nor dismissed.
 */
export function fixtureScript(options = {}) {
  const config = {
    lang: "en",
    theme: "light",
    hand: "right",
    data: "full",
    onboarding: "done",
    appVersion: "1.1.0",
    ...options,
    now: Date.parse(FIXED_NOW),
  };
  return `(${pageFixture.toString()})(${JSON.stringify(config)});`;
}

function pageFixture(config) {
  // ----------------------------------------------------------------- clock ---
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) {
      if (args.length) super(...args);
      else super(config.now);
    }
    static now() {
      return config.now;
    }
  }
  window.Date = FixedDate;

  // ----------------------------------------------------------- preferences ---
  try {
    localStorage.clear();
    localStorage.setItem("moojot_theme", config.theme);
    localStorage.setItem("moojot_hand", config.hand);
    localStorage.setItem("moojot_onboarding", config.onboarding);
    const whatsNewSeen = "whatsNewSeen" in config ? config.whatsNewSeen : config.appVersion;
    if (whatsNewSeen !== null) localStorage.setItem("moojot_whats_new_seen", whatsNewSeen);
    if (config.feedbackCard) {
      localStorage.setItem(
        "moojot.feedbackCard",
        JSON.stringify({ firstSeenDate: "2026-03-14", successfulScans: 2, dismissed: false, used: false }),
      );
    }
  } catch {
    // about:blank has no storage; the real page load sets these.
  }

  // Animations and transitions would leave a screenshot mid-flight, and a
  // blinking caret makes two captures of the same screen differ.
  const freeze = () => {
    const style = document.createElement("style");
    style.textContent =
      "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }";
    document.head.append(style);
  };
  if (document.head) freeze();
  else document.addEventListener("DOMContentLoaded", freeze, { once: true });

  // ------------------------------------------------------------------ data ---
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new RealDate(config.now);

  const category = (id, nameEn, nameTh, kind, icon, color, sortOrder) => ({
    id, nameEn, nameTh, kind, icon, color, isSystem: true, sortOrder, archived: false,
  });
  // The default categories the app seeds (src-tauri/src/db.rs).
  const categories = [
    category("cat_food", "Food", "อาหารและเครื่องดื่ม", "spending", "utensils", "#f97316", 1),
    category("cat_transport", "Transport & car", "เดินทางและรถยนต์", "spending", "car", "#06b6d4", 2),
    category("cat_necessities", "Necessities", "ของใช้จำเป็น", "spending", "shopping-basket", "#eab308", 3),
    category("cat_shopping", "Shopping", "ช้อปปิ้ง", "spending", "shopping-bag", "#ec4899", 4),
    category("cat_entertainment", "Entertainment", "บันเทิง", "spending", "film", "#ef4444", 5),
    category("cat_home", "Home & utilities", "บ้านและสาธารณูปโภค", "spending", "home", "#3b82f6", 6),
    category("cat_health", "Health & wellness", "สุขภาพ", "spending", "heart-pulse", "#14b8a6", 7),
    category("cat_family", "Family & pets", "ครอบครัวและสัตว์เลี้ยง", "spending", "users", "#a855f7", 8),
    category("cat_giving", "Giving", "ให้และทำบุญ", "spending", "gift", "#8b5cf6", 9),
    category("cat_travel", "Travel", "ท่องเที่ยว", "spending", "plane", "#0ea5e9", 10),
    category("cat_education", "Education", "การศึกษา", "spending", "graduation-cap", "#6366f1", 11),
    category("cat_work", "Work & business", "งานและธุรกิจ", "spending", "briefcase", "#d97706", 12),
    category("cat_invest", "Save & invest", "ออมและลงทุน", "spending", "trending-up", "#84cc16", 13),
    category("cat_loans", "Loans & cards", "สินเชื่อและบัตรเครดิต", "spending", "credit-card", "#64748b", 14),
    category("cat_other_spend", "Other", "อื่นๆ", "spending", "ellipsis", "#94a3b8", 15),
    category("cat_salary", "Salary", "เงินเดือน", "income", "wallet", "#22c55e", 1),
    category("cat_wages", "Wages", "ค่าจ้าง", "income", "hand-coins", "#10b981", 2),
    category("cat_gifts_in", "Gifts", "ของขวัญ / โบนัส", "income", "gift", "#84cc16", 3),
    category("cat_trade", "Trade & business", "ค้าขาย / ธุรกิจ", "income", "store", "#14b8a6", 4),
    category("cat_cashback", "Cashback", "เงินคืน", "income", "rotate-ccw", "#06b6d4", 5),
    category("cat_other_in", "Other", "อื่นๆ", "income", "ellipsis", "#94a3b8", 6),
  ];
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const accounts = [
    { id: "cash", nameEn: "Cash", nameTh: "เงินสด", kind: "cash", bankCode: null, color: "#10b981", usesSharedAlbum: false, enabled: true },
    { id: "kbank", nameEn: "Kasikornbank", nameTh: "กสิกรไทย", kind: "bank", bankCode: "004", color: "#138f2d", usesSharedAlbum: false, enabled: true },
    { id: "scb", nameEn: "Siam Commercial Bank", nameTh: "ไทยพาณิชย์", kind: "bank", bankCode: "014", color: "#4e2e7f", usesSharedAlbum: false, enabled: true },
  ];

  const tags = [
    { id: "tag_trip", name: "trip", color: "#0ea5e9", disabled: false, sortOrder: 1 },
    { id: "tag_bigspending", name: "bigspending", color: "#ef4444", disabled: false, sortOrder: 2 },
  ];

  const settings = {
    language: config.lang, monthStartDay: 1, weekStartDay: 1, defaultView: "monthly",
    allowSharedAlbum: false, ownerNames: [], aksonOcrApiKey: "", aksonOcrModel: "",
    englishOcrEngine: "mlkit_latin", appLockEnabled: Boolean(config.appLock),
    reminderEnabled: Boolean(config.reminder), reminderTime: config.reminder ? "20:30" : "20:00",
  };

  // [day of March 2026, time, kind, amount in baht, category, account, payee, extra fields]
  const rows = [
    [18, "08:10", "spending", 65, "cat_food", "cash", "Morning Coffee Cart", {}],
    [18, "09:05", "spending", 47, "cat_transport", "kbank", "Skytrain", { source: "slip_auto" }],
    [18, "12:20", "spending", 189, "cat_food", "kbank", "Noodle House", { source: "slip_auto", isReviewed: false }],
    [17, "13:45", "spending", 1290, "cat_shopping", "scb", "Online Marketplace", { source: "slip_auto", tagIds: ["tag_bigspending"] }],
    [17, "19:30", "spending", 320, "cat_food", "kbank", "Hot Pot Dinner", { source: "slip_auto" }],
    [16, "10:00", "transfer", 5000, null, "kbank", "To savings", { source: "slip_auto" }],
    [16, "18:40", "spending", 419, "cat_entertainment", "scb", "Movie Stream", { source: "recurring", recurringRuleId: "rule_stream" }],
    [15, "09:00", "income", 1250.5, "cat_cashback", "kbank", "Card cashback", {}],
    [15, "11:15", "spending", 846.75, "cat_necessities", "kbank", "Fresh Mart", { source: "slip_auto" }],
    [14, "16:25", "spending", 240, null, "kbank", "PROMPTPAY x1234", { source: "slip_auto", parseStatus: "needs_review", isReviewed: false }],
    [12, "07:50", "spending", 1500, "cat_transport", "scb", "Fuel Station", { source: "slip_auto" }],
    [10, "14:00", "spending", 3200, "cat_travel", "scb", "Seaside Guesthouse", { source: "slip_auto", tagIds: ["tag_trip"] }],
    [5, "20:10", "spending", 2140, "cat_home", "kbank", "Electricity bill", { source: "slip_auto" }],
    [1, "06:00", "income", 45000, "cat_salary", "kbank", "Salary", {}],
    [1, "08:30", "spending", 12000, "cat_home", "kbank", "Rent", { source: "recurring", recurringRuleId: "rule_rent", note: "Monthly rent" }],
  ];
  const records = rows.map(([day, time, kind, baht, categoryId, accountId, payeeRaw, extra], index) => {
    const localDate = "2026-03-" + pad(day);
    return {
      id: "rec-" + pad(index + 1), kind, amountSatang: Math.round(baht * 100), currency: "THB",
      localDate, localTime: time, accountId, categoryId, payeeRaw, note: null, source: "manual",
      parseStatus: "ok", isReviewed: true, recurringRuleId: null, tagIds: [], slipRef: null,
      slipQrRaw: null, slipOcrText: null, slipImagePath: null, createdAt: localDate + "T" + time + ":00Z",
      ...extra,
    };
  });

  const sum = (list, kind) => list.filter((r) => r.kind === kind).reduce((total, r) => total + r.amountSatang, 0);

  // Month `offset` away from the fixed today. Only offset 0 has records.
  function period(offset) {
    const start = new RealDate(today.getFullYear(), today.getMonth() + offset, 1);
    const end = new RealDate(start.getFullYear(), start.getMonth() + 1, 0);
    const label = monthNames[start.getMonth()] + " " + String(start.getFullYear()).slice(2);
    return { startDate: iso(start), endDate: iso(end), label };
  }

  function recordsFor(offset, accountIds) {
    if (config.data === "empty" || offset !== 0) return [];
    return accountIds?.length ? records.filter((r) => accountIds.includes(r.accountId)) : records;
  }

  function homeData({ periodOffset = 0, accountIds = null }) {
    const list = recordsFor(periodOffset, accountIds);
    const dayGroups = [];
    for (const rec of list) {
      let group = dayGroups.at(-1);
      if (!group || group.localDate !== rec.localDate) {
        const date = new RealDate(rec.localDate + "T00:00:00");
        group = {
          localDate: rec.localDate,
          dayOfWeek: rec.localDate === iso(today) ? "Today" : dayNames[date.getDay()],
          dayNumber: date.getDate(), spendingSatang: 0, incomeSatang: 0, transferCount: 0, records: [],
        };
        dayGroups.push(group);
      }
      group.records.push(rec);
      if (rec.kind === "spending") group.spendingSatang += rec.amountSatang;
      if (rec.kind === "income") group.incomeSatang += rec.amountSatang;
      if (rec.kind === "transfer") group.transferCount += 1;
    }
    const spending = sum(list, "spending");
    const income = sum(list, "income");
    const futureRecords = list.length
      ? [{ ruleId: "rule_rent", kind: "spending", amountSatang: 1200000, dueDate: "2026-04-01", categoryId: "cat_home", note: "Monthly rent", frequency: "monthly", dayOfMonth: 1 }]
      : [];
    return {
      period: period(periodOffset), totalSpendingSatang: spending, totalIncomeSatang: income,
      totalTransferSatang: sum(list, "transfer"), remainingSatang: income - spending, dayGroups,
      futureRecords, futureTotalSatang: futureRecords.reduce((total, f) => total + f.amountSatang, 0),
      needsReviewCount: list.filter((r) => r.parseStatus !== "ok").length, todayJottedCount: 3,
      syncStreakDays: 4, categorizeStreakDays: 2, bestStreakDays: 9,
    };
  }

  function summaryData({ periodOffset = 0, kind = "spending", accountIds = null }) {
    const list = recordsFor(periodOffset, accountIds);
    const ofKind = list.filter((r) => r.kind === kind);
    const total = ofKind.reduce((t, r) => t + r.amountSatang, 0);
    const share = (amount) => (total ? Math.round((amount / total) * 1000) / 10 : 0);

    const byCategoryMap = new Map();
    const byTagMap = new Map();
    for (const rec of ofKind) {
      const cat = byCategoryMap.get(rec.categoryId) ?? { amountSatang: 0, count: 0 };
      cat.amountSatang += rec.amountSatang;
      cat.count += 1;
      byCategoryMap.set(rec.categoryId, cat);
      for (const tagId of rec.tagIds) {
        const tag = byTagMap.get(tagId) ?? { amountSatang: 0, count: 0 };
        tag.amountSatang += rec.amountSatang;
        tag.count += 1;
        byTagMap.set(tagId, tag);
      }
    }
    const byAmount = (a, b) => b.amountSatang - a.amountSatang;
    const byCategory = [...byCategoryMap].map(([categoryId, agg]) => {
      const cat = categoryById.get(categoryId);
      return {
        categoryId, nameEn: cat?.nameEn ?? "Uncategorized", nameTh: cat?.nameTh ?? "ยังไม่จัดหมวด",
        icon: cat?.icon ?? "ellipsis", color: cat?.color ?? "#94a3b8", ...agg, percentage: share(agg.amountSatang),
      };
    }).sort(byAmount);
    const byTag = [...byTagMap].map(([tagId, agg]) => {
      const tag = tags.find((t) => t.id === tagId);
      return { tagId, name: tag.name, color: tag.color, ...agg, percentage: share(agg.amountSatang) };
    }).sort(byAmount);

    const spending = sum(list, "spending");
    const income = sum(list, "income");
    return {
      period: period(periodOffset), incomeSatang: income, spendingSatang: spending,
      transferSatang: sum(list, "transfer"), remainingSatang: income - spending, byCategory, byTag,
    };
  }

  function compareData({ periodOffset = 0, kind = "spending", months = 6, accountIds = null }) {
    // Earlier months, oldest first; the current month comes from the records.
    const history = [1986000, 2241500, 1763000, 2530000, 2098000];
    const current = recordsFor(periodOffset, accountIds).filter((r) => r.kind === kind).reduce((t, r) => t + r.amountSatang, 0);
    const bars = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const p = period(periodOffset - i);
      const amountSatang = i === 0 ? current : config.data === "empty" ? 0 : history[(history.length - i + 50) % history.length];
      bars.push({ label: p.label, startDate: p.startDate, endDate: p.endDate, amountSatang, isCurrent: i === 0 });
    }
    const averageSatang = Math.round(bars.reduce((t, b) => t + b.amountSatang, 0) / bars.length);
    return { bars, averageSatang, currentSatang: current, deltaVsAverageSatang: current - averageSatang };
  }

  function budgets({ periodOffset = 0, accountIds = null }) {
    const list = recordsFor(periodOffset, accountIds);
    if (!list.length) return [];
    const daysRemaining = 14;
    const budget = (id, scopeType, scopeId, scopeLabel, scopeIcon, scopeColor, limitSatang, spentSatang) => ({
      id, scopeType, scopeId, scopeLabel, scopeIcon, scopeColor, periodType: "monthly", limitSatang, spentSatang,
      remainingSatang: limitSatang - spentSatang, spentPct: Math.round((spentSatang / limitSatang) * 100),
      todayPacePct: 58, avgDailySpentSatang: Math.round(spentSatang / 18),
      avgDailyRemainingSatang: Math.round((limitSatang - spentSatang) / daysRemaining), daysRemaining,
      alertThresholdPct: 80,
    });
    const food = list.filter((r) => r.kind === "spending" && r.categoryId === "cat_food").reduce((t, r) => t + r.amountSatang, 0);
    return [
      budget("budget_total", "total", null, "Total Spending", null, "#ea580c", 3000000, sum(list, "spending")),
      budget("budget_food", "category", "cat_food", "Food", "utensils", "#f97316", 60000, food),
    ];
  }

  const payeeRules = [
    { id: "rule-1", pattern: "noodle house", categoryId: "cat_food", hitCount: 12, isBuiltin: false },
    { id: "rule-2", pattern: "skytrain", categoryId: "cat_transport", hitCount: 31, isBuiltin: false },
    { id: "rule-3", pattern: "fresh mart", categoryId: "cat_necessities", hitCount: 7, isBuiltin: false },
  ];

  function searchRecords({ query = "" }) {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return records.filter((r) => (r.payeeRaw ?? "").toLowerCase().includes(needle) || (r.note ?? "").toLowerCase().includes(needle));
  }

  // ---------------------------------------------------------------- invoke ---
  // Every command a scene may call is listed here. A command that is missing
  // is recorded in __moojotUnmocked and fails the scene, so a new backend call
  // can't slip in and quietly render nothing.
  const handlers = {
    post_due_recurring_records: () => 0,
    get_settings: () => settings,
    update_settings: (args) => void Object.assign(settings, args.settings),
    get_accounts: () => accounts,
    get_categories: () => categories,
    get_tags: () => tags,
    list_scanned_months: () => (config.data === "empty" ? [] : ["2026-03", "2026-02"]),
    get_home_data: homeData,
    get_summary_data: summaryData,
    get_compare_data: compareData,
    get_budgets: budgets,
    get_album_scan_keywords: () => [],
    list_known_slip_media_ids: () => [],
    list_payee_rules: () => payeeRules,
    search_records: searchRecords,
    "plugin:app|version": () => config.appVersion,
    // The person closes Android's unlock prompt: the lock card stays up.
    "plugin:biometric|authenticate": () => {
      throw { message: "Cancel button was pressed", code: "userCancel" };
    },
  };

  window.__moojotUnmocked = [];
  let callbackId = 0;

  // ------------------------------------------------------- android bridge ---
  if (config.android) {
    window.__moojotScans = [];
    window.MooJotAndroid = {
      isAndroidNative: () => true,
      setStatusBarLight: () => {},
      hasGalleryPermission: () => config.android === "granted",
      requestGalleryPermission: () => {},
      // Records the scan and never answers, so the app stays in its "scanning" state.
      scanBankSlips: (keywordsJson, includeShared, sinceSec) => void window.__moojotScans.push({ sinceSec, includeShared }),
      pickSlipPhoto: () => {},
      backfillExistingSlips: () => {},
      readSlipImageDataUrl: () => null,
      shareTextFile: () => false,
      pickStatementPdf: () => {},
      setRecentsHidden: () => {},
      hasNotificationPermission: () => true,
      requestNotificationPermission: () => {},
      configureReminder: () => {},
      markJotted: () => {},
      updateWidget: () => {},
      takeWidgetAction: () => "",
    };
  }
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args = {}) => {
      const handler = handlers[cmd];
      if (!handler) {
        window.__moojotUnmocked.push(cmd);
        return null;
      }
      // Hand out copies so the app can't change the fixture between calls.
      const result = handler(args);
      return result === undefined ? null : JSON.parse(JSON.stringify(result));
    },
    transformCallback: (callback, once) => {
      const id = ++callbackId;
      window["_" + id] = (payload) => {
        if (once) delete window["_" + id];
        callback?.(payload);
      };
      return id;
    },
    unregisterCallback: (id) => {
      delete window["_" + id];
    },
    convertFileSrc: (path) => path,
    metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
  };
}
