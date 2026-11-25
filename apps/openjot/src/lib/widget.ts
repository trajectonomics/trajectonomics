// Home-screen widget (#81). The app writes this snapshot after each change and Android draws it
// (MooWidget.kt), so the widget never reads the database itself.

import type { HomePayload } from "./types";

export interface WidgetSnapshot {
  /** The local day the numbers are for, YYYY-MM-DD. */
  date: string;
  /** Last day of the payday period (inclusive), YYYY-MM-DD. */
  periodEnd: string;
  todayText: string;
  periodText: string;
  /** Shown for a new day or period the app hasn't opened in yet. */
  zeroText: string;
  streakDays: number;
  /** The app lock is on: show dots instead of amounts. */
  hideAmounts: boolean;
  theme: string;
  labels: { today: string; period: string; streak: string; add: string; scan: string };
}

const LABELS = {
  en: { today: "Today", period: "This period", streak: "🔥 {n}-day streak", add: "+ Jot", scan: "Scan" },
  th: { today: "วันนี้", period: "งวดนี้", streak: "🔥 จดต่อเนื่อง {n} วัน", add: "+ จด", scan: "สแกน" },
} as const;

/**
 * The widget's numbers, from this period's Home data (no account filter). `today` is the local
 * date, YYYY-MM-DD; `baht` formats satang the way the app does.
 */
export function widgetSnapshot(
  home: Pick<HomePayload, "period" | "totalSpendingSatang" | "dayGroups" | "syncStreakDays" | "categorizeStreakDays">,
  today: string,
  options: { lang: "en" | "th"; theme: string; hideAmounts: boolean; baht: (satang: number) => string }
): WidgetSnapshot {
  const { baht } = options;
  const todaySatang = home.dayGroups.find((g) => g.localDate === today)?.spendingSatang ?? 0;
  return {
    date: today,
    periodEnd: home.period.endDate,
    todayText: baht(todaySatang),
    periodText: baht(home.totalSpendingSatang),
    zeroText: baht(0),
    // Days in a row with slips synced, or with records categorized, whichever run is longer.
    streakDays: Math.max(0, home.syncStreakDays, home.categorizeStreakDays),
    hideAmounts: options.hideAmounts,
    theme: options.theme,
    labels: { ...LABELS[options.lang] },
  };
}

/** What a widget button asks for: open the new-record sheet, or scan slips. */
export type WidgetAction = "add" | "scan";

export function parseWidgetAction(value: unknown): WidgetAction | null {
  return value === "add" || value === "scan" ? value : null;
}
