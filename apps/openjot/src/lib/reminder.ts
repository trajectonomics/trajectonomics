// Opt-in daily reminder (#80). The setting lives in SQLite with the others; Android keeps a copy
// so the alarm fires with the app closed (DailyReminder.kt). This module holds the pieces the
// unit tests can check without Android.

export const DEFAULT_REMINDER_TIME = "20:00";

/** "HH:MM" → hour and minute. Anything else falls back to 20:00. */
export function parseReminderTime(value: string | null | undefined): { hour: number; minute: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 24 && minute < 60) return { hour, minute };
  }
  return { hour: 20, minute: 0 };
}

/** The local calendar date, `YYYY-MM-DD`: the day a jot counts for. */
export function localDateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The notification, in the app's language. */
export function reminderText(lang: "en" | "th"): { title: string; body: string } {
  return lang === "th"
    ? { title: "ถึงเวลาจดแล้ว 🐷", body: "วันนี้ใช้เงินไปกับอะไรบ้าง สแกนสลิปหรือจดสั้น ๆ กับมูได้เลย" }
    : { title: "Time to jot 🐷", body: "What did you spend on today? Scan your slips or jot it down with Moo." };
}

/** What a reminder sync sends to Android. */
export function reminderConfig(settings: { reminderEnabled: boolean; reminderTime: string; language: "en" | "th" }) {
  const { hour, minute } = parseReminderTime(settings.reminderTime);
  return { enabled: settings.reminderEnabled, hour, minute, ...reminderText(settings.language) };
}
