/**
 * Month periods that honor the "Month starts on" setting, mirroring
 * `analytics::compute_month_period` in src-tauri/src/analytics.rs.
 *
 * A period's key is "YYYY-MM": the calendar month the period STARTS in. With
 * start day 25, the period 25 Oct – 24 Nov 2026 has key "2026-10". With start
 * day 1 the key is just the calendar month, so scanned-month keys stored
 * before custom periods existed keep their meaning and need no migration.
 */
export interface MonthPeriod {
  /** Local midnight of the first day. */
  start: Date;
  /** Local midnight of the last day. */
  end: Date;
  key: string;
}

const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Same clamp as the backend: start days 29–31 become 28. */
export function clampMonthStartDay(day: number): number {
  return Number.isFinite(day) ? Math.min(28, Math.max(1, Math.trunc(day))) : 1;
}

/** `index` counts months as year * 12 + zero-based month. */
function periodAt(index: number, startDay: number): MonthPeriod {
  const year = Math.floor(index / 12);
  const month = index - year * 12;
  return {
    start: new Date(year, month, startDay),
    // Day before the next period starts; day 0 is the last day of the month.
    end: new Date(year, month + 1, startDay - 1),
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
  };
}

/** Month index of the period that contains `date`. */
function periodIndexOf(date: Date, startDay: number): number {
  const index = date.getFullYear() * 12 + date.getMonth();
  return date.getDate() < startDay ? index - 1 : index;
}

/** The period `offset` periods away from the one containing `today`. */
export function monthPeriod(offset: number, monthStartDay: number, today: Date = new Date()): MonthPeriod {
  const startDay = clampMonthStartDay(monthStartDay);
  return periodAt(periodIndexOf(today, startDay) + offset, startDay);
}

/** The period a stored "YYYY-MM" key stands for, or null if the key is malformed. */
export function periodForKey(key: string, monthStartDay: number): MonthPeriod | null {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return null;
  return periodAt(year * 12 + month - 1, clampMonthStartDay(monthStartDay));
}

/** Keys of every period from the one containing `since` through the current one, oldest first. */
export function periodKeysSince(
  since: Date,
  monthStartDay: number,
  today: Date = new Date(),
  limit = 36
): string[] {
  const startDay = clampMonthStartDay(monthStartDay);
  const last = periodIndexOf(today, startDay);
  const keys: string[] = [];
  for (let i = periodIndexOf(since, startDay); i <= last && keys.length < limit; i++) {
    keys.push(periodAt(i, startDay).key);
  }
  return keys;
}

/** "25 Oct - 24 Nov": the backend's label for periods whose start day isn't 1. */
export function periodRangeLabel(period: MonthPeriod): string {
  const { start, end } = period;
  return `${start.getDate()} ${MONTH_SHORT_EN[start.getMonth()]} - ${end.getDate()} ${MONTH_SHORT_EN[end.getMonth()]}`;
}
