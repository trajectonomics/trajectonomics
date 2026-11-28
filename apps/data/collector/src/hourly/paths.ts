import { join } from "node:path"
import { fail } from "../commands/errors"

const USAGE = "Usage: bun src/cli.ts hourly [--config <path>]"

/** The default hosts file. */
export function defaultConfigPath(home: string): string {
	return join(home, ".config/traj-data/hosts.json")
}

/** The default state directory that holds one cursor per host. */
export function defaultStateDir(home: string): string {
	return join(home, ".local/state/traj-data")
}

/** Parses `hourly` arguments; `--config` overrides the default hosts file. */
export function parseConfigPath(argv: readonly string[], home: string): string {
	let path = defaultConfigPath(home)
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i] ?? ""
		if (arg === "--help" || arg === "-h") {
			console.log(USAGE)
			process.exit(0)
		}
		if (arg !== "--config") fail(`Unknown argument: ${arg}`, USAGE)
		const value = argv[i + 1]
		if (value === undefined) fail("--config needs a value", USAGE)
		path = value
		i += 1
	}
	return path
}
