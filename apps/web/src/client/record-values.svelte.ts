import type { AccountValues } from "../lib/contract"
import {
	NO_PROBLEMS,
	recordValuesOf,
	type SentRows,
	type SheetDraft,
	type SheetProblems,
} from "../lib/view/record-values/draft"
import { refusalProblems } from "../lib/view/record-values/refusal"
import type { ValueSheet } from "../lib/view/record-values/types"
import { editSession } from "./edit.svelte.js"

/**
 * The Record today's values sheet of this tab: whether it is open, what was typed, and what the last save
 * stated. The account to count against is chosen once and kept while the tab lives; it is not stored
 * anywhere, so a restarted Dashboard asks again ([ADR 0008](../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
 */
class ValueSheetSession {
	open = $state(false)
	date = $state("")
	against = $state("")
	values = $state<Record<string, string>>({})
	problems = $state<SheetProblems>(NO_PROBLEMS)
	/** What `traj` stated for the last save; null until one ran. */
	saved = $state<AccountValues | null>(null)
	private sent: SentRows = []

	/** The typed state, as the view model reads it. */
	draft(): SheetDraft {
		return { date: this.date, against: this.against, values: this.values }
	}

	/** Opens the sheet, with the date at the Snapshot's As-of unless one was already typed. */
	show(asOf: string): void {
		if (this.date === "") this.date = asOf
		this.open = true
	}

	/** Sends every row with a value as one Edit; the answer is shown on its rows, or as the result. */
	async save(sheet: ValueSheet): Promise<void> {
		const built = recordValuesOf(this.draft(), sheet)
		editSession.clear()
		if (!built.ok) {
			this.problems = built.problems
			return
		}
		this.sent = built.sent
		this.problems = NO_PROBLEMS
		if (await editSession.run(built.edit, "record-values")) {
			this.saved = editSession.result
			return
		}
		const failure = editSession.failure
		this.problems = failure
			? refusalProblems(failure, this.sent)
			: { rows: {}, general: editSession.error ?? "The values were not saved." }
	}

	/** Closes the sheet. After a save it also forgets what was typed; before one it keeps it. */
	close(): void {
		this.open = false
		if (this.saved === null) return
		this.date = ""
		this.values = {}
		this.saved = null
		this.problems = NO_PROBLEMS
	}
}

/** The one sheet of the page. */
export const valueSheetSession = new ValueSheetSession()
