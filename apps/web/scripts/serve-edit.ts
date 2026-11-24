// The write path of the loopback server: the session token, and POST /edit, which runs one Edit through
// traj, re-reads the Snapshot and answers it ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { z } from "zod"
import type { Read, Snapshot } from "../src/lib/contract"
import { type Edit, writeCommand } from "../src/lib/edit/edit"
import { followPlan } from "../src/lib/edit/follow"
import { EDIT_TOKEN_HEADER, refuseEdit, refuseSession } from "../src/lib/edit/guard"
import { rereadAllowances } from "./run-reread"
import { runTraj } from "./run-traj"
import { failure, readEdit, readReread, refused } from "./serve-edit-answer"
import type { Editor, EditorOptions } from "./serve-editor"
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

	/** Runs one write through traj, dry or real, and keeps its Read. */
	async function write(edit: Edit, dryRun: boolean): Promise<Read<unknown>> {
		const command = writeCommand(edit, dryRun)
		return runTraj(options.traj, command.argv, z.unknown(), command.stdin)
	}

	/** Answers a Snapshot run: the Snapshot, or the CLI's error as data. */
	function answerOf(run: SnapshotRun): Response {
		if (!run.ok) return failure(200, run.error)
		return json(200, `{"ok":true,"snapshot":${JSON.stringify(run.snapshot)}}`)
	}

	/** The Edit's own run: dry first, then the real write, then the Snapshot read again. */
	async function apply(request: Request): Promise<Response> {
		const read = await readEdit(request)
		if (!read.ok) return failure(400, read.error)
		const { edit } = read
		const dry = await write(edit, true)
		if (!dry.ok) return failure(200, dry.error)
		const real = await write(edit, false)
		if (!real.ok) return failure(200, real.error)
		params = { ...params, scenarios: followPlan(params.scenarios, edit) }
		return answerOf(await refresh())
	}

	/** Reads the Snapshot again, with the allowance inputs the body states, and answers it, or the CLI's error as data. */
	async function rereadAnswer(request: Request): Promise<Response> {
		const read = await readReread(request)
		if (!read.ok) return failure(400, read.error)
		// The allowance inputs live with the Snapshot's parameters, so a change of them is a read and no write.
		const { allowances } = read.reread
		if (allowances !== undefined) params = { ...params, allowances }
		// Only the allowance inputs changed: run only the allowance reads, if nothing else moved (run-reread.ts).
		if (allowances === undefined || held === null) return answerOf(await refresh())
		const { traj, cliVersion, records } = options
		return answerOf(keep(await rereadAllowances(traj, cliVersion, params, held, records)))
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
