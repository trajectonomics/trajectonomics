/**
 * The scratch D1 directory the e2e run migrates and serves, its marker under `.wrangler/`, and the
 * one read the assertions make through `wrangler d1 execute --local`. Everything is local: no
 * command here can reach the owner's Cloudflare account.
 */
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const wrangler = join(packageRoot, "node_modules", ".bin", "wrangler")

/** The file that tells the Playwright config and teardown which directory this run owns. */
export const SCRATCH_MARKER = join(packageRoot, ".wrangler", "e2e-scratch")

/** A fresh scratch directory under `~/.cache`, named so only this run's directory matches. */
export function createScratch(): string {
	return mkdtempSync(join(homedir(), ".cache", "traj-auth-e2e-"))
}

/** Removes a directory `createScratch` made. */
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
		throw new Error(
			`e2e migrations failed:\n${result.stdout.toString()}\n${result.stderr.toString()}`,
		)
	}
}

/** Writes the marker the config and teardown read. */
export function writeScratch(directory: string): void {
	mkdirSync(dirname(SCRATCH_MARKER), { recursive: true })
	writeFileSync(SCRATCH_MARKER, directory)
}

/** The scratch directory this run owns, or `undefined` when `prepare.ts` has not run. */
export function scratchDir(): string | undefined {
	try {
		return readFileSync(SCRATCH_MARKER, "utf8").trim() || undefined
	} catch {
		return undefined
	}
}

/** Removes the marker file. */
export function removeMarker(): void {
	rmSync(SCRATCH_MARKER, { force: true })
}

/** Rows one local D1 query returns; the database is the scratch one, never a remote one. */
export function queryLocal<T>(directory: string, sql: string): T[] {
	return queryLocalMany<T>(directory, sql)[0] ?? []
}

/**
 * One `wrangler d1 execute` for several statements, one result list per statement. Spawning the
 * local D1 client is the slow part, so a check that reads every table reads them at once.
 */
export function queryLocalMany<T>(directory: string, sql: string): T[][] {
	const output = execFileSync(
		wrangler,
		[
			"d1",
			"execute",
			"traj-auth",
			"--local",
			"--persist-to",
			directory,
			"--json",
			"--command",
			sql,
		],
		{ cwd: packageRoot, encoding: "utf8" },
	)
	const parsed = JSON.parse(output) as Array<{ results?: T[] }>
	return parsed.map((entry) => entry.results ?? [])
}
