/**
 * The plans whose vendor states no monthly window, so a measured or estimated 30-day figure is
 * the week × 30/7: Claude states 5-hour and weekly limits only, and Antigravity refreshes its
 * quota weekly and every five hours (the notes in `collector/src/tier-catalog/`).
 */
export const MONTH_FROM_WEEK: ReadonlySet<string> = new Set(["claude", "antigravity"])
