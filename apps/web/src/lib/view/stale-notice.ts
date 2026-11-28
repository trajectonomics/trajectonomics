/** Which cases a stale notice says: both in a drawer, only a plan that moved on beside an inline form, only a write that landed unread above the page. */
export type NoticeShows = "both" | "stale" | "landed"

/** What the notice says now, or null. A refusal over a plan that moved on is said before a landed write. */
export function noticeCase(
	shows: NoticeShows,
	stale: boolean,
	savedUnread: boolean,
): "stale" | "landed" | null {
	if (stale && shows !== "landed") return "stale"
	if (savedUnread && shows !== "stale") return "landed"
	return null
}
