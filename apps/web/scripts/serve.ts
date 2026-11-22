/// <reference path="./pack-module.d.ts" />
// The loopback server `traj dashboard` runs: it reads the Snapshot from the caller's traj, then serves
// the packed pages and that Snapshot on 127.0.0.1 until it is stopped
// ([ADR 0007](../docs/adr/0007-traj-dashboard-serves-the-dashboard-on-loopback.md)).
import type { ErrorBody, Snapshot } from "../src/lib/contract"
import { assetKeys, contentTypeOf, isLoopbackHost, SNAPSHOT_PATH } from "../src/lib/serve/route"
import type { PlanParams } from "../src/lib/snapshot"
import { decodePack, type Pack } from "./pack-format"
import type { RunContext } from "./run-traj"
import { runSnapshot } from "./snapshot-run"

export {
	checkParams,
	type PlanInput,
	type PlanParams,
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

const HEADERS = {
	"cache-control": "no-store",
	"referrer-policy": "no-referrer",
	"x-content-type-options": "nosniff",
	"x-frame-options": "DENY",
}

/** The packed pages this build carries, or null when it was built without them. */
export async function loadPack(): Promise<Pack | null> {
	try {
		const module = await import("../pack/dashboard.bin", { with: { type: "file" } })
		return decodePack(await Bun.file(module.default).text())
	} catch {
		return null
	}
}

function text(status: number, body: string): Response {
	return new Response(body, {
		status,
		headers: { ...HEADERS, "content-type": "text/plain; charset=utf-8" },
	})
}

/** Answers one request: the Snapshot, a packed file, or a refusal. Only this machine is served. */
export function respond(request: Request, pack: Pack, snapshot: string, port: number): Response {
	if (request.method !== "GET" && request.method !== "HEAD") return text(405, "Method not allowed")
	if (!isLoopbackHost(request.headers.get("host"), port)) return text(403, "Forbidden")
	const { pathname } = new URL(request.url)
	const json = "application/json; charset=utf-8"
	if (pathname === SNAPSHOT_PATH) {
		return new Response(snapshot, { headers: { ...HEADERS, "content-type": json } })
	}
	for (const key of assetKeys(pathname)) {
		const bytes = pack.get(key)
		if (bytes !== undefined) {
			return new Response(bytes, { headers: { ...HEADERS, "content-type": contentTypeOf(key) } })
		}
	}
	return text(404, "Not found")
}

const NO_PAGES: ErrorBody = {
	code: "internal",
	exitCode: 1,
	message: "This build of traj carries no Dashboard pages.",
	hint: "Build apps/web (bun run build) before you build or run traj from a checkout.",
}

/** Reads the Snapshot, then serves it with the pages. A failed stage one or a taken port stops it. */
export async function startDashboard(options: DashboardOptions): Promise<DashboardStart> {
	const pack = await loadPack()
	if (pack === null) return { ok: false, error: NO_PAGES }
	const run = await runSnapshot(options.traj, options.cliVersion, options.params, options.records)
	if (!run.ok) return run
	const body = JSON.stringify(run.snapshot)
	try {
		const server = Bun.serve({
			hostname: "127.0.0.1",
			port: options.port,
			fetch: (request, self): Response => respond(request, pack, body, self.port ?? options.port),
		})
		const url = `http://127.0.0.1:${server.port}/`
		return { ok: true, server: { url, snapshot: run.snapshot, stop: () => server.stop(true) } }
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error)
		return { ok: false, error: portTaken(options.port, reason) }
	}
}

function portTaken(port: number, reason: string): ErrorBody {
	return {
		code: "port_unavailable",
		exitCode: 2,
		message: `The Dashboard could not listen on 127.0.0.1:${port}: ${reason}`,
		hint: "Pass --port with another number, or --port 0 to let the system pick one.",
	}
}
