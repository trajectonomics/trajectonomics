import { Database } from "bun:sqlite"
import { join } from "node:path"

const packageRoot = new URL("../../", import.meta.url).pathname
const wrangler = join(packageRoot, "node_modules", ".bin", "wrangler")

/**
 * Runs one statement against the scratch D1 database that `wrangler dev` is serving. The spike
 * uses it only to age a consent or a device code, to delete a consent the way the provider's
 * disabled delete-consent path would, and to clear the rate-limit table between token groups.
 */
export function executeSql(directory: string, command: string): Array<Record<string, unknown>> {
	const result = Bun.spawnSync(
		[
			wrangler,
			"d1",
			"execute",
			"traj-auth",
			"--local",
			"--persist-to",
			directory,
			"--json",
			"--command",
			command,
		],
		{ cwd: packageRoot, stdout: "pipe", stderr: "pipe" },
	)
	if (result.exitCode !== 0) {
		throw new Error(`sql failed:\n${result.stdout.toString()}\n${result.stderr.toString()}`)
	}
	const parsed = JSON.parse(result.stdout.toString()) as Array<{
		results?: Array<Record<string, unknown>>
	}>
	return parsed[0]?.results ?? []
}

/** The token endpoint allows 20 requests a minute, so each spike group starts from zero. */
export function resetRateLimits(directory: string): void {
	executeSql(directory, "delete from rateLimit")
}

/**
 * The scratch D1 database file, opened directly. A case that must delete rows while the Worker is
 * mid-request cannot wait for a `wrangler d1 execute` CLI start, so it writes to the same SQLite
 * file Miniflare serves. The file is found by its `verification` table, not by a fixed path.
 */
export function openScratchDatabase(directory: string): Database {
	for (const file of new Bun.Glob("**/*.sqlite").scanSync({
		cwd: directory,
		absolute: true,
		dot: true,
	})) {
		let database: Database | undefined
		try {
			database = new Database(file)
			const row = database
				.query("select count(*) as n from sqlite_master where name='verification'")
				.get() as { n?: number } | null
			if (Number(row?.n ?? 0) > 0) {
				database.run("pragma busy_timeout=5000")
				return database
			}
			database.close()
		} catch {
			database?.close()
		}
	}
	throw new Error("the scratch D1 database file was not found")
}
