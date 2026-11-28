import type { PlanParams } from "../src/lib/snapshot"
import type { RunContext } from "./run-traj"
import type { SnapshotRun } from "./snapshot-run"

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
	/** Answers GET /edit-session: the token, to this machine's page only, and whether a landed write is unread. */
	session: (request: Request, port: number) => Response
	/** Answers POST /edit: refused, or run and answered with the new Snapshot or the error as data. */
	edit: (request: Request, port: number) => Promise<Response>
	/** Answers POST /reread: the same guards, then the Snapshot read again, with no write. */
	reread: (request: Request, port: number) => Promise<Response>
	/** Answers POST /what-if: the same guards, then four reads with the Overrides, and no write. */
	whatIf: (request: Request, port: number) => Promise<Response>
}
