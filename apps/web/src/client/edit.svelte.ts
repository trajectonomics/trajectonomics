import type { ErrorBody } from "../lib/contract"
import { type EditAnswer, editAnswer, sessionAnswer } from "../lib/edit/answer"
import type { EditInput } from "../lib/edit/edit"
import { EDIT_PATH, EDIT_SESSION_PATH, EDIT_TOKEN_HEADER, REREAD_PATH } from "../lib/edit/guard"
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
	/** The CLI's error envelope of the last refused Edit, so a form can show it at the field it names. */
	failure = $state<ErrorBody | null>(null)
	/** True when the CLI refused an Edit over a plan that changed since the page read it (cli ADR 0055). */
	stale = $state(false)
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
	}

	/** Sends one Edit and shows the Snapshot it answers with. Returns true when the Edit ran. */
	async run(edit: EditInput): Promise<boolean> {
		if (this.token === null || this.busy) return false
		this.busy = true
		this.error = null
		this.failure = null
		this.stale = false
		try {
			const response = await fetch(EDIT_PATH, {
				method: "POST",
				headers: { "content-type": "application/json", [EDIT_TOKEN_HEADER]: this.token },
				body: JSON.stringify(edit),
				cache: "no-store",
			})
			const answer = editAnswer.safeParse(await response.json())
			return this.settle(answer.success ? answer.data : null)
		} catch {
			this.error = "The Dashboard could not reach traj. Try again."
			return false
		} finally {
			this.busy = false
		}
	}

	/** Asks the server to read the Snapshot again and shows it. The form keeps what the person typed. */
	async reread(): Promise<void> {
		if (this.token === null || this.busy) return
		this.busy = true
		try {
			const response = await fetch(REREAD_PATH, {
				method: "POST",
				headers: { "content-type": "application/json", [EDIT_TOKEN_HEADER]: this.token },
				body: "{}",
				cache: "no-store",
			})
			const answer = editAnswer.safeParse(await response.json())
			if (!answer.success) this.error = "The Dashboard could not read the answer to the Edit."
			else if (answer.data.ok) {
				replaceSnapshot(answer.data.snapshot)
				this.clear()
			} else this.error = answer.data.error.message
		} catch {
			this.error = "The Dashboard could not reach traj. Try again."
		} finally {
			this.busy = false
		}
	}

	private settle(answer: EditAnswer | null): boolean {
		if (answer === null) {
			this.error = "The Dashboard could not read the answer to the Edit."
			return false
		}
		if (!answer.ok) {
			this.failure = answer.error
			// A plan that moved on has its own sentence and a Reload action, so no form repeats the CLI's text.
			if (answer.error.code === "scenario_changed") this.stale = true
			else this.error = answer.error.message
			return false
		}
		replaceSnapshot(answer.snapshot)
		return true
	}

	private async fetchToken(): Promise<void> {
		try {
			const response = await fetch(EDIT_SESSION_PATH, { cache: "no-store" })
			if (!response.ok) return
			const session = sessionAnswer.safeParse(await response.json())
			if (session.success) this.token = session.data.token
		} catch {
			// No server answers here, so the controls stay hidden.
		}
	}
}

/** The one write path of the page. */
export const editSession = new EditSession()
