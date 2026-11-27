import { mkdtempSync, openSync, readFileSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { BASE_URL, DEV_VARS, PORT } from "./config"

const packageRoot = new URL("../../", import.meta.url).pathname
const wrangler = join(packageRoot, "node_modules", ".bin", "wrangler")

/** A scratch directory under ~/.cache; the caller removes it in a finally block. */
export function makeScratch(): string {
	return mkdtempSync(join(homedir(), ".cache", "traj-auth-spike-"))
}

export function removeScratch(directory: string): void {
	rmSync(directory, { recursive: true, force: true })
}

/** Applies `migrations/` to the scratch D1 database before the Worker starts. */
export function applyMigrations(directory: string): void {
	const result = Bun.spawnSync(
		[wrangler, "d1", "migrations", "apply", "traj-auth", "--local", "--persist-to", directory],
		{ cwd: packageRoot, stdout: "pipe", stderr: "pipe" },
	)
	if (result.exitCode !== 0) {
		throw new Error(`migrations failed:\n${result.stdout.toString()}\n${result.stderr.toString()}`)
	}
}

export type LocalServer = {
	stop: () => Promise<void>
	log: () => string
}

/** Starts `wrangler dev --local` against the scratch database and waits for `/api/auth/ok`. */
export async function startServer(directory: string): Promise<LocalServer> {
	const logPath = join(directory, "wrangler.log")
	const logFd = openSync(logPath, "w")
	const vars = Object.entries(DEV_VARS).flatMap(([key, value]) => ["--var", `${key}:${value}`])
	const process_ = Bun.spawn(
		[
			wrangler,
			"dev",
			"--local",
			"--port",
			String(PORT),
			"--persist-to",
			directory,
			"--infer-origin-from-routes",
			"false",
			"--log-level",
			"warn",
			...vars,
		],
		{ cwd: packageRoot, stdout: logFd, stderr: logFd, env: { ...process.env } },
	)
	const stop = async (): Promise<void> => {
		process_.kill()
		await Promise.race([process_.exited, Bun.sleep(5_000)])
		process_.kill("SIGKILL")
	}
	const log = (): string => readFileSync(logPath, "utf8")
	const ready = await waitForReady()
	if (!ready) {
		await stop()
		throw new Error(`wrangler dev did not become ready:\n${log()}`)
	}
	return { stop, log }
}

async function waitForReady(): Promise<boolean> {
	for (let attempt = 0; attempt < 240; attempt += 1) {
		try {
			const response = await fetch(`${BASE_URL}/api/auth/ok`)
			if (response.ok) return true
		} catch {
			// The port is not open yet.
		}
		await Bun.sleep(250)
	}
	return false
}
