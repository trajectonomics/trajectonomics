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
