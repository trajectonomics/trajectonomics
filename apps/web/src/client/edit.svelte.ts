import { editAnswer, type PreviewAnswer } from "../lib/edit/answer"
import type { EditInput } from "../lib/edit/edit"
import { type EditOutcome, editOutcome } from "../lib/edit/outcome"
import type { AllowancePlan } from "../lib/snapshot/allowance-params"
import type { ChanceInputs } from "../lib/snapshot/chance-params"
import { isActionSource } from "../lib/view/action-source"
import { dismissDropped, showDropped } from "./dropped-anchors.svelte.js"
import { fetchEditSession, postEdit, postPreview } from "./edit-post.js"
import { EditState } from "./edit-state.svelte.js"
import { focused, focusRefusal } from "./refused-focus.js"
import { postReread, type RereadBody } from "./reread.js"
import { replaceSnapshot } from "./snapshot.svelte.js"

/** The sentence a refused Edit shows when the plan moved on since the page read it. */
export const STALE_PLAN = "This plan changed since the page read it."

/**
 * The page's write path: the session token the server gives this page, and one Edit at a time. The
 * token is held in memory only, so a reload asks again. Controls show only while `token` is set.
 */
class EditSession extends EditState {
	private opened: Promise<void> | null = null

	/** Asks the server for the session once. A server that does not answer (`vite preview`) leaves the token null. */
	open(): Promise<void> {
		this.opened ??= this.fetchSession()
		return this.opened
	}

	/** Sends one Edit and shows the Snapshot it answers with. Returns true when the Edit ran. */
	async run(edit: EditInput, source = "form"): Promise<boolean> {
		if (this.token === null || this.busy) return false
		const pressed = focused()
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
			if (this.error !== null || this.stale) void focusRefusal(pressed)
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

	/** The Reload of the notice copy `from`: only that copy says why it failed, and no form's error or source moves. */
	reload(from: string): Promise<boolean> {
		return this.sendReread({}, from)
	}

	private async sendReread(body: RereadBody, from: string | null = null): Promise<boolean> {
		if (this.token === null || this.busy) return false
		this.busy = true
		this.reloadError = null
		this.reloadFrom = null
		if (from === null) {
			// A plain reread beside an inline action keeps its source, so one that fails is said there too.
			if (Object.keys(body).length > 0 || !isActionSource(this.source)) this.source = "form"
			this.error = null
		}
		const answer = await postReread(this.token, body)
		this.busy = false
		if (answer.ok) {
			this.savedUnread = false
			this.clear()
		} else if (from === null) this.error = answer.message
		else {
			this.reloadFrom = from
			this.reloadError = answer.message
		}
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
		if (this.savedUnread) this.landings += 1
		return true
	}

	private async fetchSession(): Promise<void> {
		const session = await fetchEditSession()
		// A page loaded while the server's Snapshot lacks a landed write says so, as the page that wrote did.
		if (session?.unread === true) this.savedUnread = true
		this.token = session?.token ?? null
	}
}

/** The one write path of the page. */
export const editSession = new EditSession()
