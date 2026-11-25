// Send feedback by email (#90). Pure pieces, with no Svelte or Tauri imports, so the unit
// tests can run them: the mailto link, the Android version, and the rule for the one-time
// card on Home.

export const FEEDBACK_EMAIL = "support@trajectonomics.com";

export type FeedbackLang = "en" | "th";

// Text inside the email, not the app's UI, so it lives here: this module has to load in plain
// Node for the unit tests, which can't follow the extensionless import of i18n.ts.
const MAIL_NOTE: Record<FeedbackLang, string> = {
  en: "Please don't include account numbers or slip photos.",
  th: "กรุณาอย่าใส่เลขบัญชีหรือรูปสลิป",
};

/** "Android 14" in a user-agent string → "14". Anything else → null. */
export function androidVersionFromUserAgent(ua: string | null | undefined): string | null {
  const match = /Android\s+(\d+(?:\.\d+)*)/i.exec(ua ?? "");
  return match ? match[1] : null;
}

/**
 * The mail the feedback button opens. Only the app version, Android version and app language
 * are added: never records, amounts, payees or ids.
 */
export function feedbackMailto(info: {
  version: string;
  androidVersion: string | null;
  lang: FeedbackLang;
}): string {
  const subject = `[MooJot feedback] ${info.version}`;
  const body = [
    "",
    "",
    "---",
    MAIL_NOTE[info.lang],
    `App: MooJot ${info.version}`,
    `Android: ${info.androidVersion ?? "unknown"}`,
    `Language: ${info.lang}`,
  ].join("\n");
  // encodeURIComponent writes a space as %20, never "+".
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ---- The one-time card on Home ----

export interface FeedbackCardState {
  /** The local date (YYYY-MM-DD) the app first ran with this feature. */
  firstSeenDate: string;
  /** Gallery scans and picked slip photos that finished without an error. */
  successfulScans: number;
  dismissed: boolean;
  used: boolean;
}

/** Scans that make the card show up, whatever the day. */
export const FEEDBACK_CARD_SCANS = 2;
/** Calendar days after the first run (so the 3rd day of use). */
export const FEEDBACK_CARD_DAYS = 2;

const KEY = "moojot.feedbackCard";

/** Whole calendar days from one YYYY-MM-DD to another, ignoring time zones and DST. */
function daysBetween(from: string, to: string): number {
  const parse = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

/** Show the card when it was neither dismissed nor used, after 2 scans or on the 3rd day. */
export function shouldShowFeedbackCard(state: FeedbackCardState, today: string): boolean {
  if (state.dismissed || state.used) return false;
  if (state.successfulScans >= FEEDBACK_CARD_SCANS) return true;
  return daysBetween(state.firstSeenDate, today) >= FEEDBACK_CARD_DAYS;
}

/** Saved state, or a fresh one first seen `today`. Storage trouble gives a card that stays hidden. */
export function loadFeedbackCard(today: string): FeedbackCardState {
  const fresh: FeedbackCardState = { firstSeenDate: today, successfulScans: 0, dismissed: false, used: false };
  if (typeof window === "undefined") return { ...fresh, dismissed: true };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FeedbackCardState>;
      if (typeof parsed.firstSeenDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.firstSeenDate)) {
        return {
          firstSeenDate: parsed.firstSeenDate,
          successfulScans: Number.isFinite(parsed.successfulScans) ? Number(parsed.successfulScans) : 0,
          dismissed: parsed.dismissed === true,
          used: parsed.used === true,
        };
      }
    }
    window.localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    // Storage is blocked: we can't remember a dismissal, so never show the card.
    return { ...fresh, dismissed: true };
  }
}

export function saveFeedbackCard(state: FeedbackCardState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore storage restrictions
  }
}
