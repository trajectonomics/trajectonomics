// The write path of the loopback server: the session token, and POST /edit, which runs one Edit through
// traj, re-reads the Snapshot and answers it ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import type { Snapshot } from "../src/lib/contract"
import { followCompare, followPlan } from "../src/lib/edit/follow"
import { EDIT_TOKEN_HEADER, refuseEdit, refuseSession } from "../src/lib/edit/guard"
import { changedBy, paramsAfter, rereadInputs } from "./run-reread"
import { runEdit } from "./serve-apply"
import { answerOf, failure, readEdit, readReread, refused } from "./serve-edit-answer"
import type { Editor, EditorOptions } from "./serve-editor"
import { answerPath } from "./serve-path"
import { json } from "./serve-respond"
import { answerWhatIf } from "./serve-what-if"
import { runSnapshot, type SnapshotRun } from "./snapshot-run"

export type { Editor, EditorOptions }

/** Creates the editor for one server. The token is the one the server made at start. */
export function createEditor(options: EditorOptions): Editor {
	let params = options.params
	let body: string | null = null
	let held: Snapshot | null = null
	let busy = false

	/** Keeps a Snapshot that ran as the served body and as the one a later reread may keep reads of. */
	function keep(run: SnapshotRun): SnapshotRun {
		if (run.ok) {
			body = JSON.stringify(run.snapshot)
			held = run.snapshot
		}
		return run
	}

	async function refresh(): Promise<SnapshotRun> {
		return keep(await runSnapshot(options.traj, options.cliVersion, params, options.records))
	}

	/** The Edit's own run: dry first, then the real write, then the Snapshot read again. */
	async function apply(request: Request): Promise<Response> {
		const read = await readEdit(request)
		if (!read.ok) return failure(400, read.error)
		const { edit } = read
		const error = await runEdit(options.traj, edit)
		if (error !== null) return failure(200, error)
		params = {
			...params,
			scenarios: followPlan(params.scenarios, edit),
			compare: followCompare(params.compare, edit),
		}
		return answerOf(await refresh())
	}

	/** Reads the Snapshot again, with the allowance or chance inputs the body states, and answers it, or the CLI's error as data; or reads one path. */
	async function rereadAnswer(request: Request): Promise<Response> {
		const read = await readReread(request)
		if (!read.ok) return failure(400, read.error)
		// One path is read alone: nothing of the Snapshot, the parameters or the served body changes.
		if (read.reread.path !== undefined) {
			return answerPath(read.reread.path, params, held, options.traj, options.records)
		}
		const stored = held?.reads.scenarios.ok
			? held.reads.scenarios.data.scenarios.map((plan) => plan.name)
			: []
		params = paramsAfter(params, read.reread, stored)
		const changed = changedBy(read.reread)
		// Only those inputs changed: run only the reads that depend on them, if nothing else moved (run-reread.ts).
		if ((!changed.allowances && !changed.chance) || held === null) return answerOf(await refresh())
		const { traj, cliVersion, records } = options
		return answerOf(keep(await rereadInputs(traj, cliVersion, params, held, records, changed)))
	}

	/**
	 * Runs one request that changes or reads the Snapshot, after the guards: refused, or run with the busy
	 * flag set. The guards and the flag are read and set before the first await, so a second request that
	 * arrives while this one runs is refused rather than run beside it.
	 */
	function admit(request: Request, port: number, work: () => Promise<Response>): Promise<Response> {
		const refusal = refuseEdit({
			method: request.method,
			host: request.headers.get("host"),
			origin: request.headers.get("origin"),
			token: request.headers.get(EDIT_TOKEN_HEADER),
			contentType: request.headers.get("content-type"),
			expectedToken: options.token,
			ready: body !== null,
			busy,
			port,
		})
		if (refusal) return Promise.resolve(refused(refusal.status, refusal.code, refusal.message))
		busy = true
		return work().finally(() => {
			busy = false
		})
	}

	return {
		get body() {
			return body
		},
		refresh,
		session(request, port) {
			const refusal = refuseSession({
				method: request.method,
				host: request.headers.get("host"),
				port,
			})
			if (refusal) return refused(refusal.status, refusal.code, refusal.message)
			return json(200, JSON.stringify({ token: options.token }))
		},
		edit: (request, port) => admit(request, port, () => apply(request)),
		reread: (request, port) => admit(request, port, () => rereadAnswer(request)),
		whatIf: (request, port) =>
			admit(request, port, () => answerWhatIf(request, params, options.traj, options.records)),
	}
}
