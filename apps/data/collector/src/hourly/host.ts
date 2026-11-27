import { join } from "node:path"
import { errorMessage } from "../message"
import { type IngestRow, parseIngestLines } from "../rows"
import type { HostConfig } from "./config"
import type { Spawner } from "./spawn"

function cliPath(host: HostConfig): string {
	return join(host.collectorDir, "src/cli.ts")
}

/** Builds the argv for one collector subcommand, over ssh when the host names one. */
export function hostArgv(host: HostConfig, args: readonly string[]): string[] {
	const command = [host.bun, cliPath(host), ...args]
	if (host.ssh === null) return command
	return [
		"ssh",
		"-o",
		"BatchMode=yes",
		"-o",
		"ConnectTimeout=10",
		"-o",
		"ServerAliveInterval=15",
		"-o",
		"ServerAliveCountMax=3",
		"--",
		host.ssh,
		...command,
	]
}

/** The argv that reads a host's usage since the cursor overlap. */
export function usageArgv(host: HostConfig, since: string): string[] {
	const args = ["usage", "--since", since]
	if (host.skipOpenCodeBefore !== null) {
		args.push("--skip-opencode-before", host.skipOpenCodeBefore)
	}
	return hostArgv(host, args)
}

/** The argv that samples a host's quotas. */
export function quotaArgv(host: HostConfig): string[] {
	return hostArgv(host, ["quota"])
}

async function run(
	argv: readonly string[],
	spawn: Spawner,
	log: (line: string) => void,
	label: string,
): Promise<string | null> {
	try {
		const result = await spawn(argv)
		if (result.exitCode === 0) return result.stdout
		log(`hourly: ${label} exited with code ${result.exitCode}`)
	} catch (error) {
		log(`hourly: ${label} could not run: ${errorMessage(error)}`)
	}
	return null
}

function rowsFrom(output: string, label: string, log: (line: string) => void): IngestRow[] | null {
	try {
		return parseIngestLines(output)
	} catch (error) {
		log(`hourly: ${label}: ${errorMessage(error)}`)
		return null
	}
}

/** Collects one host's usage and optional quota; null means the host failed. */
export async function collectHost(
	host: HostConfig,
	since: string,
	spawn: Spawner,
	log: (line: string) => void,
): Promise<IngestRow[] | null> {
	const usage = await run(usageArgv(host, since), spawn, log, `${host.name} usage`)
	if (usage === null) return null
	const rows = rowsFrom(usage, `${host.name} usage`, log)
	if (rows === null) return null
	if (host.quota) {
		const quota = await run(quotaArgv(host), spawn, log, `${host.name} quota`)
		if (quota === null) return null
		const quotaRows = rowsFrom(quota, `${host.name} quota`, log)
		if (quotaRows === null) return null
		rows.push(...quotaRows)
	}
	return rows
}
