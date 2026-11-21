import { join } from "node:path"

/** The repository root, where wrangler finds `wrangler.jsonc` and its assets directory. */
export const ROOT = join(import.meta.dir, "..", "..")
/** The `wrangler` binary of this repository's own install. */
export const WRANGLER = join(ROOT, "node_modules", ".bin", "wrangler")
export const START_TIMEOUT_MS = 45_000

/** One local dev server for the Worker with Static Assets. */
export type DevServer = Bun.Subprocess<"inherit", "pipe", "pipe">

/** A free loopback port, taken and released before wrangler binds it. */
export async function freePort(): Promise<number> {
	const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("") })
	const port = server.port
	await server.stop(true)
	if (port === undefined) throw new Error("Bun.serve did not report the port it bound")
	return port
}

/** The probe's environment: no Cloudflare credential, so the Worker must start without one. */
function probeEnv(): Record<string, string> {
	const env: Record<string, string> = {}
	for (const [key, value] of Object.entries(process.env)) {
		if (value === undefined || key.startsWith("CLOUDFLARE_")) continue
		env[key] = value
	}
	return { ...env, WRANGLER_SEND_METRICS: "false", BROWSER: "none" }
}

/** Start `wrangler dev` for the Site on the two given ports. */
export function startDevServer(port: number, inspectorPort: number): DevServer {
	return Bun.spawn({
		cmd: [
			WRANGLER,
			"dev",
			"--ip",
			"127.0.0.1",
			"--port",
			String(port),
			"--inspector-port",
			String(inspectorPort),
			"--show-interactive-dev-session=false",
		],
		cwd: ROOT,
		env: probeEnv(),
		stdout: "pipe",
		stderr: "pipe",
		detached: true,
	})
}

/** Signal the dev server's whole process group, so workerd dies with wrangler. */
export function signalGroup(proc: DevServer, signal: NodeJS.Signals): void {
	try {
		process.kill(-proc.pid, signal)
	} catch {
		proc.kill(signal)
	}
}

/** Stop wrangler and its workerd child, forcing both after three seconds. */
export async function stop(proc: DevServer): Promise<void> {
	if (proc.exitCode !== null) return
	const force = setTimeout(() => signalGroup(proc, "SIGKILL"), 3_000)
	signalGroup(proc, "SIGTERM")
	await proc.exited
	clearTimeout(force)
}

/**
 * Wait until the Site answers its one address with 200, or until the start timeout runs out. Any
 * other answer is not the Site: wrangler's dev proxy answers 403 before the Worker takes a request,
 * so a check that accepted any response would probe a server that is not serving the build yet.
 */
export async function waitUntilServing(baseUrl: string, proc: DevServer): Promise<boolean> {
	const deadline = Date.now() + START_TIMEOUT_MS
	while (Date.now() < deadline) {
		if (proc.exitCode !== null) return false
		try {
			const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) })
			if (response.ok) return true
		} catch {
			// The server is not answering yet, which is what this loop waits out.
		}
		await Bun.sleep(250)
	}
	return false
}
