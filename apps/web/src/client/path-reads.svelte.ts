import type { ProjectionPath, Read } from "../lib/contract"
import { EDIT_TOKEN_HEADER, REREAD_PATH } from "../lib/edit/guard"
import { pathAnswer } from "../lib/snapshot/paths"
import type { LiveEntry } from "../lib/view/chance/path-state"

/** The sentences the page shows when a live read cannot be had. */
const UNREACHABLE = "The Dashboard could not reach traj. Try again."
const UNREADABLE = "The Dashboard could not read the answer to the future."
const BUSY = "The Dashboard is still busy with an Edit. Try opening this future again in a moment."

/** The code the server answers (409) while another request runs: the only 409 worth asking again. */
const EDIT_RUNNING = "edit_running"

/**
 * How long a read waits before it asks again while an Edit runs, each wait longer than the last. An Edit that states a
 * chance runs for up to ten seconds, so the waits add up to fifteen.
 */
export const BUSY_WAITS_MS: readonly number[] = [1000, 2000, 4000, 8000]

/** How a live read ended: the path's read, or the sentence of why there is none. */
type Settled =
	| { status: "done"; read: Read<ProjectionPath> }
	| { status: "failed"; message: string }

/** The key of one future: the plan and the path's index. */
function keyOf(plan: string, index: number): string {
	return JSON.stringify([plan, index])
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Posts one path read. The entry it ends in is "busy" for a 409 that says an Edit runs, so the caller can ask again; any other refusal shows the server's own sentence. */
async function post(token: string, plan: string, index: number): Promise<Settled | "busy"> {
	try {
		const response = await fetch(REREAD_PATH, {
			method: "POST",
			headers: { "content-type": "application/json", [EDIT_TOKEN_HEADER]: token },
			body: JSON.stringify({ path: { plan, index } }),
			cache: "no-store",
		})
		const answer = pathAnswer.safeParse(await response.json())
		if (!answer.success) return { status: "failed", message: UNREADABLE }
		if (response.status === 409 && !answer.data.ok && answer.data.error.code === EDIT_RUNNING) {
			return "busy"
		}
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
export class PathReads {
	entries = $state<Record<string, LiveEntry>>({})

	/** `wait` is how a read lets time pass between two asks; a test passes one that does not. */
	constructor(private readonly wait: (ms: number) => Promise<void> = sleep) {}

	/** What this tab holds of one future. */
	entry(plan: string, index: number): LiveEntry | undefined {
		return this.entries[keyOf(plan, index)]
	}

	/** Reads one future for a run, unless this tab already holds or is reading it for that run. */
	async load(token: string, plan: string, index: number, run: string): Promise<void> {
		const key = keyOf(plan, index)
		if (this.entries[key]?.run === run) return
		this.entries = { ...this.entries, [key]: { run, status: "loading" } }
		for (let attempt = 0; attempt <= BUSY_WAITS_MS.length; attempt++) {
			const reply = await post(token, plan, index)
			if (reply !== "busy") {
				this.entries = { ...this.entries, [key]: { run, ...reply } }
				return
			}
			const wait = BUSY_WAITS_MS[attempt]
			if (wait !== undefined) await this.wait(wait)
		}
		this.entries = { ...this.entries, [key]: { run, status: "failed", message: BUSY } }
	}
}

/** The tab's live futures. */
export const pathReads = new PathReads()
