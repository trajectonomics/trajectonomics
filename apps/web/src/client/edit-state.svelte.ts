import type { AccountValues, ErrorBody } from "../lib/contract"

/** What the page's write path states: each is reactive, and the pages read them from the session. */
export class EditState {
	token = $state<string | null>(null)
	busy = $state(false)
	error = $state<string | null>(null)
	/** Who sent the last request, so only that control shows its error: "form", or a year's key. */
	source = $state<string>("form")
	/** The CLI's error envelope of the last refused Edit, so a form can show it at the field it names. */
	failure = $state<ErrorBody | null>(null)
	/** True when the CLI refused an Edit over a plan that changed since the page read it (cli ADR 0055). */
	stale = $state(false)
	/** True from a write that landed while the read after it failed, until the page shows a Snapshot read since. `clear()` leaves it. */
	savedUnread = $state(false)
	/** How many writes have landed unread in this visit, so the notice says each one again. */
	landings = $state(0)
	/** Why the notice's own Reload failed. Only the notice says it: no form's `error` holds it. */
	reloadError = $state<string | null>(null)
	/** What the last Edit that ran stated, as the CLI stated it: the batch of `record-values`. Null for any other. */
	result = $state<AccountValues | null>(null)

	/** Forgets the last request's error, so a form opened afterwards shows none of it. */
	clear(): void {
		this.error = null
		this.failure = null
		this.stale = false
		this.reloadError = null
		this.result = null
	}
}
