/**
 * Touch targets that keep the horizontal month swipe to themselves: a record
 * row has its own swipe-to-delete, and a button or link must not be dragged
 * sideways. A pull-to-refresh still starts from all of them, because it only
 * acts once the drag is vertical.
 */
const MONTH_SWIPE_BLOCKERS = "[data-swipe-row], button, a, input, textarea, select";

/** Text entry, where a drag places the cursor or selects text instead. */
const TEXT_ENTRY = "input, textarea, select, [contenteditable]";

/**
 * Decides what a touch starting on `target` inside the Home tab may do, without
 * looking at the direction yet: `pull` for the pull-to-refresh, `monthSwipe`
 * for dragging the month left or right. The caller resolves the axis first and
 * drops a horizontal gesture when `monthSwipe` is false.
 */
export function homeGestureStart(target: Element | null): {
  pull: boolean;
  monthSwipe: boolean;
} {
  if (!target) return { pull: false, monthSwipe: false };
  if (target.closest(TEXT_ENTRY)) return { pull: false, monthSwipe: false };
  return { pull: true, monthSwipe: target.closest(MONTH_SWIPE_BLOCKERS) === null };
}
