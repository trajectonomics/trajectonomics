import type { ProjectionPath, Read } from "../lib/contract"
import { EDIT_TOKEN_HEADER, REREAD_PATH } from "../lib/edit/guard"
import { pathAnswer } from "../lib/snapshot/paths"
import type { LiveEntry } from "../lib/view/chance/path-state"

/** The sentences the page shows when a live read cannot be had. */
const UNREACHABLE = "The Dashboard could not reach traj. Try again."
const UNREADABLE = "The Dashboard could not read the answer to the future."
const BUSY = "The Dashboard is busy with another request. Reload the page to open this future."

/** How many times a read answered 409 (another request runs on the server) is asked again, and after how long. */
const BUSY_RETRIES = 2
const BUSY_WAIT_MS = 400

/** How a live read ended: the path's read, or the sentence of why there is none. */
type Settled =
	| { status: "done"; read: Read<ProjectionPath> }
	| { status: "failed"; message: string }

/** The key of one future: the plan and the path's index. */
function keyOf(plan: string, index: number): string {
	return JSON.stringify([plan, index])
}

/** Posts one path read. The entry it ends in is "busy" for a 409, so the caller can ask again. */
async function post(token: string, plan: string, index: number): Promise<Settled | "busy"> {
	try {
		const response = await fetch(REREAD_PATH, {
			method: "POST",
			headers: { "content-type": "application/json", [EDIT_TOKEN_HEADER]: token },
			body: JSON.stringify({ path: { plan, index } }),
			cache: "no-store",
		})
		if (response.status === 409) return "busy"
		const answer = pathAnswer.safeParse(await response.json())
		if (!answer.success) return { status: "failed", message: UNREADABLE }
		if (!answer.data.ok) return { status: "failed", message: answer.data.error.message }
		return { status: "done", read: answer.data.path }
	} catch {
		return { status: "failed", message: UNREACHABLE }
	}
}

/**
 * The futures this tab read through `POST /reread` ([web ADR 0020](../../docs/adr/0020-the-chance-page-lists-every-future-and-opens-one-year-by-year.md)),
 * each tagged with the run of the chance it was read for. Held in the tab only: a reload forgets them, and a read for another
 * run is never shown, so the Snapshot staying as it is while the server's inputs move cannot show a stale future.
 */
class PathReads {
	entries = $state<Record<string, LiveEntry>>({})

	/** What this tab holds of one future. */
	entry(plan: string, index: number): LiveEntry | undefined {
		return this.entries[keyOf(plan, index)]
	}

	/** Reads one future for a run, unless this tab already holds or is reading it for that run. */
	async load(token: string, plan: string, index: number, run: string): Promise<void> {
		const key = keyOf(plan, index)
		if (this.entries[key]?.run === run) return
		this.entries = { ...this.entries, [key]: { run, status: "loading" } }
		for (let attempt = 0; attempt <= BUSY_RETRIES; attempt++) {
			const reply = await post(token, plan, index)
			if (reply !== "busy") {
				this.entries = { ...this.entries, [key]: { run, ...reply } }
				return
			}
			if (attempt < BUSY_RETRIES) await new Promise((resolve) => setTimeout(resolve, BUSY_WAIT_MS))
		}
		this.entries = { ...this.entries, [key]: { run, status: "failed", message: BUSY } }
	}
}

/** The tab's live futures. */
export const pathReads = new PathReads()
