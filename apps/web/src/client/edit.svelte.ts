import type { ErrorBody } from "../lib/contract"
import { type EditAnswer, editAnswer, sessionAnswer } from "../lib/edit/answer"
import type { Edit } from "../lib/edit/edit"
import { EDIT_PATH, EDIT_SESSION_PATH, EDIT_TOKEN_HEADER } from "../lib/edit/guard"
import { replaceSnapshot } from "./snapshot.svelte.js"

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
	}

	/** Sends one Edit and shows the Snapshot it answers with. Returns true when the Edit ran. */
	async run(edit: Edit): Promise<boolean> {
		if (this.token === null || this.busy) return false
		this.busy = true
		this.error = null
		this.failure = null
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

	private settle(answer: EditAnswer | null): boolean {
		if (answer === null) {
			this.error = "The Dashboard could not read the answer to the Edit."
			return false
		}
		if (!answer.ok) {
			this.error = answer.error.message
			this.failure = answer.error
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
