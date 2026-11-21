import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { CLI_RELEASE_PATH, type CliRelease, errorsOf, helpSection } from "../src/lib/cli-release"
import { createCommandReferenceDeps } from "./adapters/command-reference"
import type { CommandReferenceDeps } from "./command-reference/deps"
import { CheckError } from "./command-reference/errors"
import { readRelease } from "./command-reference/release"

/** The version named by `--version X.Y.Z`, or undefined for npm's `latest`. */
function requestedVersion(argv: readonly string[]): string | undefined {
	const index = argv.indexOf("--version")
	if (index === -1) return undefined
	const version = argv[index + 1]
	if (version === undefined || !/^\d+\.\d+\.\d+$/.test(version)) {
		throw new CheckError("VERSION_INVALID", "--version takes a release such as 0.4.0")
	}
	return version
}

/** Read a published release in full: the command-reference snapshot plus the root help and registry. */
export async function snapshotRelease(
	deps: CommandReferenceDeps,
	version: string | undefined,
): Promise<CliRelease> {
	const pinned: CommandReferenceDeps =
		version === undefined ? deps : { ...deps, latestVersion: async () => version }
	const release = await readRelease(pinned)
	const help = await deps.cliText(release.version, ["help"])
	const schema = await deps.cliJson(release.version, ["schema", "--json"])
	if (help === undefined || schema === undefined) {
		throw new CheckError("RELEASE_UNREADABLE", `traj ${release.version} did not print its help`)
	}
	return {
		...release,
		commands: helpSection(help, "Commands"),
		exitCodes: helpSection(help, "Exit codes"),
		environment: helpSection(help, "Environment"),
		errors: errorsOf(schema),
	}
}

/** Write the latest (or `--version`) release's snapshot and return the process exit code. */
export async function main(argv: readonly string[], deps: CommandReferenceDeps): Promise<number> {
	try {
		const release = await snapshotRelease(deps, requestedVersion(argv))
		await mkdir(dirname(CLI_RELEASE_PATH), { recursive: true })
		await Bun.write(CLI_RELEASE_PATH, `${JSON.stringify(release, null, "\t")}\n`)
		deps.print(`snapshot:cli: wrote ${CLI_RELEASE_PATH} for traj ${release.version}`)
		return 0
	} catch (error) {
		if (!(error instanceof CheckError)) throw error
		deps.print(`snapshot:cli: ${error.code}: ${error.message}`)
		return 2
	}
}

if (import.meta.main) {
	process.exitCode = await main(process.argv.slice(2), createCommandReferenceDeps())
}
