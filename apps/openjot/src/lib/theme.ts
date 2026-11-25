export type AppTheme = "light" | "dark";
export type HandMode = "left" | "right";

const STORAGE_KEY = "moojot_theme";

/**
 * Maps a stored theme value onto the current name. The retired `pink-white` and
 * `orange-black` values migrate to `light` and `dark` so a saved choice survives.
 */
export function migrateTheme(raw: string | null | undefined): AppTheme {
  if (raw === "pink-white" || raw === "light") return "light";
  if (raw === "orange-black" || raw === "dark") return "dark";
  return "light";
}

export function loadSavedTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  try {
    return migrateTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // ignore storage restrictions
    return "light";
  }
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
