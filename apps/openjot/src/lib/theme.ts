export type AppTheme = "pink-white" | "orange-black";
export type HandMode = "left" | "right";

const STORAGE_KEY = "moojot_theme";

export function loadSavedTheme(): AppTheme {
  if (typeof window === "undefined") return "pink-white";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "orange-black" || raw === "pink-white") return raw;
  } catch {
    // ignore storage restrictions
  }
  return "pink-white";
}

export function saveTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  document.documentElement.dataset.theme = theme;
}

const HAND_KEY = "moojot_hand";

export function loadSavedHand(): HandMode {
  if (typeof window === "undefined") return "right";
  try {
    const raw = window.localStorage.getItem(HAND_KEY);
    if (raw === "left" || raw === "right") return raw;
  } catch {
    // ignore storage restrictions
  }
  return "right";
}

export function saveHand(hand: HandMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HAND_KEY, hand);
  } catch {
    // ignore
  }
}
