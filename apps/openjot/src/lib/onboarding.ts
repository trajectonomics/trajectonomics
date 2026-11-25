// First-run onboarding flag, kept in localStorage next to the theme and hand
// preferences so no database migration is needed.
//
// Values: "pending" (shown, not finished yet) or "done" (finished or skipped).
// When the key is missing, the app may still be an older install from before
// onboarding existed, so `onboardingState` also looks for the theme/hand keys
// that every earlier launch wrote. Call it before the page saves those keys.

const KEY = "moojot_onboarding";
const PRIOR_LAUNCH_KEYS = ["moojot_theme", "moojot_hand"];

export type OnboardingState = "done" | "pending" | "new" | "returning";

export function onboardingState(): OnboardingState {
  if (typeof window === "undefined") return "done";
  try {
    const storage = window.localStorage;
    const raw = storage.getItem(KEY);
    if (raw === "done") return "done";
    if (raw === "pending") return "pending";
    return PRIOR_LAUNCH_KEYS.some((k) => storage.getItem(k) !== null) ? "returning" : "new";
  } catch {
    // Storage is blocked: never trap the user in a flow we can't remember.
    return "done";
  }
}

function write(value: "done" | "pending") {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // ignore storage restrictions
  }
}

export const markOnboardingPending = () => write("pending");
export const markOnboardingDone = () => write("done");

/**
 * When the first welcome tour ends with photo access allowed, the app scans this many
 * months of slips straight away (this month included), so nobody has to start it again (#47).
 */
export const FIRST_SCAN_MONTHS = 3;

/** Thai when the device language is Thai, otherwise English. */
export function deviceLanguage(): "en" | "th" {
  if (typeof navigator === "undefined") return "en";
  const primary = navigator.languages?.[0] ?? navigator.language ?? "";
  return primary.toLowerCase().startsWith("th") ? "th" : "en";
}
