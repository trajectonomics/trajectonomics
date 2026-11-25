import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWidgetAction, widgetSnapshot } from "../../src/lib/widget.ts";
import { formatBaht } from "../../src/lib/format.ts";

const baht = (satang) => `฿${formatBaht(satang)}`;

const home = {
  period: { startDate: "2026-11-01", endDate: "2026-11-30", label: "Nov 2026" },
  totalSpendingSatang: 1_234_550,
  syncStreakDays: 5,
  categorizeStreakDays: 2,
  dayGroups: [
    { localDate: "2026-11-23", dayOfWeek: "Mon", dayNumber: 23, spendingSatang: 18_900, incomeSatang: 0, transferCount: 0, records: [] },
    { localDate: "2026-11-22", dayOfWeek: "Sun", dayNumber: 22, spendingSatang: 50_000, incomeSatang: 0, transferCount: 0, records: [] },
  ],
};

test("the widget shows today's and this period's spending in baht", () => {
  const s = widgetSnapshot(home, "2026-11-23", { lang: "en", theme: "pink-white", hideAmounts: false, baht });
  assert.equal(s.todayText, "฿189");
  assert.equal(s.periodText, "฿12,345.50");
  assert.equal(s.zeroText, "฿0");
  assert.equal(s.date, "2026-11-23");
  assert.equal(s.periodEnd, "2026-11-30");
  assert.equal(s.streakDays, 5);
});

test("a day with nothing jotted yet shows ฿0 today", () => {
  const s = widgetSnapshot(home, "2026-11-24", { lang: "en", theme: "pink-white", hideAmounts: false, baht });
  assert.equal(s.todayText, "฿0");
});

test("with the app lock on, the snapshot asks Android to hide amounts", () => {
  const s = widgetSnapshot(home, "2026-11-23", { lang: "en", theme: "pink-white", hideAmounts: true, baht });
  assert.equal(s.hideAmounts, true);
});

test("labels follow the app's language and the streak has a {n} slot", () => {
  const en = widgetSnapshot(home, "2026-11-23", { lang: "en", theme: "pink-white", hideAmounts: false, baht });
  const th = widgetSnapshot(home, "2026-11-23", { lang: "th", theme: "orange-black", hideAmounts: false, baht });
  assert.equal(en.labels.today, "Today");
  assert.equal(th.labels.today, "วันนี้");
  assert.match(en.labels.streak, /\{n\}/);
  assert.match(th.labels.streak, /\{n\}/);
  assert.equal(th.theme, "orange-black");
});

test("the streak is the longer of the slip-sync and categorize streaks, never negative", () => {
  const opts = { lang: "en", theme: "x", hideAmounts: false, baht };
  assert.equal(widgetSnapshot({ ...home, syncStreakDays: 1, categorizeStreakDays: 6 }, "2026-11-23", opts).streakDays, 6);
  assert.equal(widgetSnapshot({ ...home, syncStreakDays: -1, categorizeStreakDays: -3 }, "2026-11-23", opts).streakDays, 0);
});

test("only the two widget buttons are accepted", () => {
  assert.equal(parseWidgetAction("add"), "add");
  assert.equal(parseWidgetAction("scan"), "scan");
  for (const bad of ["", null, undefined, "delete", 1]) assert.equal(parseWidgetAction(bad), null);
});
