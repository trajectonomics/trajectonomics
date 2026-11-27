import type { AccountValues, ErrorBody } from "../lib/contract"
import { editAnswer, type PreviewAnswer } from "../lib/edit/answer"
import type { EditInput } from "../lib/edit/edit"
import { type EditOutcome, editOutcome } from "../lib/edit/outcome"
import type { AllowancePlan } from "../lib/snapshot/allowance-params"
import type { ChanceInputs } from "../lib/snapshot/chance-params"
import { dismissDropped, showDropped } from "./dropped-anchors.svelte.js"
import { fetchEditToken, postEdit, postPreview } from "./edit-post.js"
import { postReread, type RereadBody } from "./reread.js"
import { replaceSnapshot } from "./snapshot.svelte.js"

/** The sentence a refused Edit shows when the plan moved on since the page read it. */
export const STALE_PLAN = "This plan changed since the page read it."

/**
 * The page's write path: the session token the server gives this page, and one Edit at a time. The
 * token is held in memory only, so a reload asks again. Controls show only while `token` is set.
 */
class EditSession {
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
	/** What the last Edit that ran stated, as the CLI stated it: the batch of `record-values`. Null for any other. */
	result = $state<AccountValues | null>(null)
	private opened: Promise<void> | null = null

	/** Asks the server for the token once. A server that does not answer (`vite preview`) leaves it null. */
	open(): Promise<void> {
		this.opened ??= this.fetchToken()
		return this.opened
	}

	/** Forgets the last Edit's error, so a form opened afterwards shows none of it. */
	clear(): void {
		this.error = null
		this.failure = null
		this.stale = false
		this.result = null
	}

	/** Sends one Edit and shows the Snapshot it answers with. Returns true when the Edit ran. */
	async run(edit: EditInput, source = "form"): Promise<boolean> {
		if (this.token === null || this.busy) return false
		this.busy = true
		this.source = source
		this.clear()
		dismissDropped()
		try {
			const answer = editAnswer.safeParse(await postEdit(this.token, edit))
			const outcome = editOutcome(answer.success ? answer.data : null)
			return this.settle(outcome, "name" in edit ? edit.name : null)
		} catch {
			this.error = "The Dashboard could not reach traj. Try again."
			return false
		} finally {
			this.busy = false
		}
	}

	/**
	 * Sends a `record-values` Edit with `preview`: the server runs the dry run only and answers its result. Nothing
	 * is written and no Snapshot is shown, so no error of the page's forms is touched. Null when it was not sent.
	 */
	async preview(edit: EditInput): Promise<PreviewAnswer | null> {
		if (this.token === null || this.busy) return null
		this.busy = true
		const answer = await postPreview(this.token, edit)
		this.busy = false
		return answer
	}

	/**
	 * Asks the server to read the Snapshot again and shows it. The form keeps what the person typed. With
	 * `allowances`, the read uses those inputs for the allowance reads (null clears them); nothing is written.
	 * Returns true when the new Snapshot is shown.
	 */
	reread(allowances?: AllowancePlan | null): Promise<boolean> {
		return this.sendReread(allowances === undefined ? {} : { allowances })
	}

	/** A reread with new paths and seed for the chance reads (web ADR 0018); nothing is written. */
	rereadChance(chance: ChanceInputs): Promise<boolean> {
		return this.sendReread({ chance })
	}

	/** Adds a plan the ledger holds to the plans the dashboard projects, and shows the new Snapshot. Nothing is written. */
	addPlan(name: string): Promise<boolean> {
		return this.sendReread({ addPlan: name })
	}

	private async sendReread(body: RereadBody): Promise<boolean> {
		if (this.token === null || this.busy) return false
		this.busy = true
		this.source = "form"
		this.error = null
		const answer = await postReread(this.token, body)
		this.busy = false
		if (answer.ok) this.savedUnread = false
		if (answer.ok) this.clear()
		else this.error = answer.message
		return answer.ok
	}

	private settle(outcome: EditOutcome, plan: string | null): boolean {
		if (outcome.kind === "unreadable") {
			this.error = "The Dashboard could not read the answer to the Edit."
			return false
		}
		if (outcome.kind === "refused") {
			this.failure = outcome.error
			// A plan that moved on has its own sentence and a Reload action; no form repeats the CLI's text.
			if (outcome.error.code === "scenario_changed") this.stale = true
			else this.error = outcome.error.message
			return false
		}
		this.result = outcome.result
		showDropped(plan, outcome)
		if (outcome.snapshot !== null) replaceSnapshot(outcome.snapshot)
		this.savedUnread = outcome.snapshot === null
		return true
	}

	private async fetchToken(): Promise<void> {
		this.token = await fetchEditToken()
	}
}

/** The one write path of the page. */
export const editSession = new EditSession()
