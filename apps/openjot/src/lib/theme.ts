export type AppTheme = "trajectonomics" | "pink-white" | "orange-black";
export type HandMode = "left" | "right";

const STORAGE_KEY = "moojot_theme";

/**
 * The `<html data-theme>` value a theme paints with. The Trajectonomics theme is the
 * brand's dark Theme, whose `--ds-*` roles live under `[data-theme="dark"]`; the
 * other two keep their own names. Keep the inline script in `src/app.html` in step
 * with this mapping: it paints the saved theme before the app runs.
 */
export function themeAttribute(theme: AppTheme): "dark" | "pink-white" | "orange-black" {
  return theme === "trajectonomics" ? "dark" : theme;
}

export function loadSavedTheme(): AppTheme {
  if (typeof window === "undefined") return "trajectonomics";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "trajectonomics" || raw === "orange-black" || raw === "pink-white") return raw;
  } catch {
    // ignore storage restrictions
  }
  return "trajectonomics";
}

export function saveTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  document.documentElement.dataset.theme = themeAttribute(theme);
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
