// What OpenJot's product analytics is allowed to send. Kept pure and dependency-free
// so it is unit tested (tests/unit/analyticsEvents.test.mjs).
//
// The rule: an event, and each property on it, must be listed here. Values are short
// labels, counts or booleans. Never send amounts, payees, notes, category or tag names,
// account names, OCR text, file names, or anything the user typed. If an event needs a
// new property, add it here and to "Anonymous usage statistics" in docs/privacy-policy.md.

export const ANALYTICS_EVENTS = {
  app_opened: ["first_run"],
  $screen: ["$screen_name"],
  onboarding_started: ["replay"],
  onboarding_step_viewed: ["step", "step_number", "replay"],
  onboarding_finished: ["completed", "last_step", "replay"],
  photo_permission_answered: ["granted"],
  slip_scan_started: ["trigger"],
  slip_scan_finished: ["trigger", "imported", "duplicates"],
  slip_scan_failed: ["trigger"],
  record_saved: ["kind", "is_new", "recurring"],
  record_deleted: ["via"],
  statement_imported: ["imported", "duplicates"],
  data_exported: ["format"],
  setting_changed: ["setting", "value"],
  usage_stats_enabled: ["where"],
} as const satisfies Record<string, readonly string[]>;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;
export type AnalyticsValue = string | number | boolean;
export type AnalyticsProps = Record<string, AnalyticsValue | null | undefined>;

/**
 * Whether the user has opted in, from the stored choice ("on" | "off" | missing).
 * Usage stats are opt-in: only an explicit "on" counts.
 */
export function statsChoiceIsOn(choice: string | null | undefined): boolean {
  return choice === "on";
}

/** A label such as "spending", "settings/about" or "1.0.0": no spaces, so no free text. */
const LABEL = /^[A-Za-z0-9_./:-]{1,40}$/;

export function isAllowedEvent(name: string): name is AnalyticsEvent {
  return Object.prototype.hasOwnProperty.call(ANALYTICS_EVENTS, name);
}

/**
 * The properties of `props` that `event` may carry, or null when the event itself is
 * not allowed. Unknown keys, free text, long strings and non-finite numbers are dropped.
 */
export function sanitizeProps(
  event: string,
  props: AnalyticsProps = {},
): Record<string, AnalyticsValue> | null {
  if (!isAllowedEvent(event)) return null;
  const out: Record<string, AnalyticsValue> = {};
  for (const key of ANALYTICS_EVENTS[event] as readonly string[]) {
    const value = props[key];
    if (typeof value === "boolean") out[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "string" && LABEL.test(value)) out[key] = value;
  }
  return out;
}
