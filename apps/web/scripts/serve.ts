// The loopback server `traj dashboard` runs: it reads the Snapshot from the caller's traj, then serves
// the packed pages and that Snapshot on 127.0.0.1 until it is stopped
// ([ADR 0007](../docs/adr/0007-traj-dashboard-serves-the-dashboard-on-loopback.md)).
import type { ErrorBody, Snapshot } from "../src/lib/contract"
import { EDIT_PATH, EDIT_SESSION_PATH } from "../src/lib/edit/guard"
import type { PlanParams } from "../src/lib/snapshot"
import { loadPack } from "./load-pack"
import type { RunContext } from "./run-traj"
import { createEditor } from "./serve-edit"
import { respond, text } from "./serve-respond"

export { snapshot as snapshotSchema } from "../src/lib/contract"
export {
	checkParams,
	type PlanInput,
	type PlanParams,
	readsOf,
} from "../src/lib/snapshot"
export type { ErrorBody, Snapshot }

/** What the server needs: how to run traj, the Plan's parameters, the Carry-in and the port. */
export type DashboardOptions = {
	traj: RunContext
	cliVersion: string
	params: PlanParams
	records: readonly unknown[]
	/** The loopback port; 0 lets the system pick a free one. */
	port: number
}

/** A running Dashboard: where it is, the Snapshot it serves, and how to stop it. */
export type DashboardServer = {
	url: string
	snapshot: Snapshot
	stop: () => Promise<void>
}

export type DashboardStart = { ok: true; server: DashboardServer } | { ok: false; error: ErrorBody }

/**
 * Binds the port first, so a taken port fails before any read runs, then reads the Snapshot and
 * serves it with the pages. The session token and the Edits are answered by the editor
 * ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)). Until the
 * Snapshot is in, its path answers 503; the URL is announced only after. A failed stage one stops the
 * server and returns that read's error.
 */
export async function startDashboard(options: DashboardOptions): Promise<DashboardStart> {
	const loaded = await loadPack()
	if (!loaded.ok) return loaded
	const { pack } = loaded
	const editor = createEditor({
		traj: options.traj,
		cliVersion: options.cliVersion,
		params: options.params,
		records: options.records,
		token: crypto.randomUUID(),
	})
	let server: ReturnType<typeof Bun.serve>
	try {
		server = Bun.serve({
			hostname: "127.0.0.1",
			port: options.port,
			fetch: (request, self): Promise<Response> | Response => {
				const port = self.port ?? options.port
				const { pathname } = new URL(request.url)
				if (pathname === EDIT_SESSION_PATH) return editor.session(request, port)
				if (pathname === EDIT_PATH) return editor.edit(request, port)
				const body = editor.body
				return body === null
					? text(503, "The Snapshot is still being read")
					: respond(request, pack, body, port)
			},
		})
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error)
		return { ok: false, error: portTaken(options.port, reason) }
	}
	const run = await editor.refresh()
	if (!run.ok) {
		await server.stop(true)
		return run
	}
	const url = `http://127.0.0.1:${server.port}/`
	return { ok: true, server: { url, snapshot: run.snapshot, stop: () => server.stop(true) } }
}

function portTaken(port: number, reason: string): ErrorBody {
	return {
		code: "port_unavailable",
		exitCode: 2,
		message: `The Dashboard could not listen on 127.0.0.1:${port}: ${reason}`,
		hint: "Pass --port with another number, or --port 0 to let the system pick one.",
	}
}
