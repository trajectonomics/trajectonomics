// The write path of the loopback server: the session token, and POST /edit, which runs one Edit through
// traj, re-reads the Snapshot and answers it ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { z } from "zod"
import type { Read } from "../src/lib/contract"
import { type Edit, followPlan, writeCommand } from "../src/lib/edit/edit"
import { EDIT_TOKEN_HEADER, refuseEdit, refuseSession } from "../src/lib/edit/guard"
import type { PlanParams } from "../src/lib/snapshot"
import type { RunContext } from "./run-traj"
import { runTraj } from "./run-traj"
import { failure, readEdit, refused } from "./serve-edit-answer"
import { json } from "./serve-respond"
import { runSnapshot, type SnapshotRun } from "./snapshot-run"

/** What an editor needs: how to run traj, the Plan's parameters, the Carry-in, and the session token. */
export type EditorOptions = {
	traj: RunContext
	cliVersion: string
	params: PlanParams
	records: readonly unknown[]
	token: string
}

/** The editor: the Snapshot it serves, a refresh of it, and the two answers the write path gives. */
export type Editor = {
	/** The Snapshot JSON the server serves; null until the first read is in. */
	readonly body: string | null
	/** Runs the Snapshot Plan with the current parameters and keeps the result as the served body. */
	refresh: () => Promise<SnapshotRun>
	/** Answers GET /edit-session: the token, to this machine's page only. */
	session: (request: Request, port: number) => Response
	/** Answers POST /edit: refused, or run and answered with the new Snapshot or the error as data. */
	edit: (request: Request, port: number) => Promise<Response>
}

/** Creates the editor for one server. The token is the one the server made at start. */
export function createEditor(options: EditorOptions): Editor {
	let params = options.params
	let body: string | null = null
	let busy = false

	async function refresh(): Promise<SnapshotRun> {
		const run = await runSnapshot(options.traj, options.cliVersion, params, options.records)
		if (run.ok) body = JSON.stringify(run.snapshot)
		return run
	}

	/** Runs one write through traj, dry or real, and keeps its Read. */
	async function write(edit: Edit, dryRun: boolean): Promise<Read<unknown>> {
		const command = writeCommand(edit, dryRun)
		return runTraj(options.traj, command.argv, z.unknown(), command.stdin)
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
		const run = await refresh()
		if (!run.ok) return failure(200, run.error)
		return json(200, `{"ok":true,"snapshot":${JSON.stringify(run.snapshot)}}`)
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
		edit(request, port) {
			// The guards and the busy flag are read and set before the first await, so a second Edit that
			// arrives while this one runs is refused rather than run beside it.
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
			return apply(request).finally(() => {
				busy = false
			})
		},
	}
}
