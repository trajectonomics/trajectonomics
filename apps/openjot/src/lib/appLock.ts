// Opt-in app lock (#79): Android checks the fingerprint, face or phone PIN, and MooJot only
// hears "unlocked" or "not unlocked". Nothing about the fingerprint reaches the app.
//
// The rules, kept free of Svelte and Tauri so the unit tests can run them:
// - the lock asks when the app starts, and when it comes back after more than LOCK_AFTER_MS
//   in the background;
// - the phone's own PIN, pattern or password is always accepted, so nobody is locked out of
//   the only copy of their records;
// - if the phone has no screen lock any more, the app opens and the lock turns itself off.

/** Back within this long: no prompt. */
export const LOCK_AFTER_MS = 60_000;

/** True when coming back to the app must show the lock prompt. */
export function lockOnReturn(enabled: boolean, hiddenAt: number | null, now: number): boolean {
  if (!enabled || hiddenAt === null) return false;
  // A clock that went backwards (time zone or manual change) locks, never unlocks.
  const away = now - hiddenAt;
  return away < 0 || away > LOCK_AFTER_MS;
}

export type UnlockResult =
  /** Android accepted the fingerprint, face or phone PIN. */
  | "unlocked"
  /** The person closed the prompt, or it timed out: keep the lock card up. */
  | "cancelled"
  /** Too many wrong tries; Android blocks fingerprints for a while. The PIN still works. */
  | "lockout"
  /** The phone has no screen lock, so there is nothing to check against. */
  | "no-screen-lock"
  /** Anything else: keep the lock card up and let the person try again. */
  | "error";

/** Maps the biometric plugin's error code to what the lock screen does next. */
export function classifyUnlockError(code: unknown): UnlockResult {
  switch (code) {
    // The plugin sends this exactly when Android says the phone has no secure screen lock
    // (KeyguardManager.isDeviceSecure is false). A busy or missing fingerprint sensor is not
    // that: the PIN still works, so those stay "error" and the lock card stays up.
    case "passcodeNotSet":
      return "no-screen-lock";
    case "biometryLockout":
      return "lockout";
    case "userCancel":
    case "systemCancel":
    case "appCancel":
    case "userFallback":
    case "authenticationFailed":
      return "cancelled";
    default:
      return "error";
  }
}

/** The error code the plugin rejects with: a plain string, or an object with a `code`. */
function errorCode(error: unknown): unknown {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "code" in error) return (error as { code: unknown }).code;
  return undefined;
}

/**
 * Shows Android's unlock prompt. The fingerprint (or face) is offered first and the phone's
 * PIN, pattern or password is always allowed.
 */
export async function requestUnlock(text: { reason: string; title: string }): Promise<UnlockResult> {
  try {
    const { authenticate } = await import("@tauri-apps/plugin-biometric");
    await authenticate(text.reason, {
      title: text.title,
      allowDeviceCredential: true,
      // Face unlock lets the person straight in, with no extra "Confirm" tap.
      confirmationRequired: false,
    });
    return "unlocked";
  } catch (error) {
    return classifyUnlockError(errorCode(error));
  }
}
