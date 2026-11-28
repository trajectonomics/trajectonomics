// The `.ts` extension keeps the module loadable from the node:test files, which run the
// source through Node's type stripping and do not resolve extensionless imports.
import { loadSavedTheme, type AppTheme } from "./theme.ts";

export type Mascot = "robot" | "moo";

// A new identifier, so it uses `openjot` rather than the `moojot` localStorage keys
// that predate the rename (rule 6 in AGENTS.md).
const STORAGE_KEY = "openjot_mascot";

/** The mascot a theme implies, used until someone picks one. */
export function mascotForTheme(theme: AppTheme): Mascot {
  return theme === "trajectonomics" ? "robot" : "moo";
}

/** Whether someone has picked a mascot. Until then it follows the theme. */
export function hasSavedMascot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "robot" || raw === "moo";
  } catch {
    return false;
  }
}

/**
 * The mascot is its own setting. Until someone picks one, it follows the theme they
 * already chose, so the update does not visibly change Moo on an existing install;
 * a new install's default theme is `trajectonomics`, so it gets the robot.
 */
export function loadSavedMascot(): Mascot {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "robot" || raw === "moo") return raw;
    } catch {
      // ignore storage restrictions
    }
  }
  return mascotForTheme(loadSavedTheme());
}

export function saveMascot(mascot: Mascot) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, mascot);
    } catch {
      // ignore
    }
  }
  syncMascotToNative(mascot);
}

/**
 * Hands the mascot to the Android side, which stores it in the `openjot_mascot`
 * SharedPreferences file and switches the launcher icon in `MainActivity.onStop`
 * (see MascotIcon.kt). The bridge is absent on the desktop build.
 */
export function syncMascotToNative(mascot: Mascot) {
  if (typeof window === "undefined") return;
  try {
    window.MooJotAndroid?.setMascot?.(mascot);
  } catch {
    // ignore a bridge that is missing or rejects the call
  }
}
