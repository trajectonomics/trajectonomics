import { hostname } from "node:os"
import { type CollectOptions, collectUsage } from "../collect"
import { machineAlias } from "../machine"
import { dropUnknownPlans } from "../rows"
import { dropOpenCodeBefore } from "../usage-filter"
import { fail } from "./errors"

const USAGE =
	"Usage: bun src/cli.ts [usage] [--since <ISO>] [--machine <name>] " +
	"[--mistral-csv <path>] [--skip-opencode-before <ISO>]"

/** Options for one usage run, including the copied-database cutoff. */
export type UsageOptions = CollectOptions & { skipOpenCodeBefore: string | null }

type Flag = "since" | "machine" | "mistralCsv" | "skipOpenCodeBefore"

const FLAGS: Record<string, Flag> = {
	"--since": "since",
	"--machine": "machine",
	"--mistral-csv": "mistralCsv",
	"--skip-opencode-before": "skipOpenCodeBefore",
}

function valueAfter(argv: readonly string[], index: number, flag: string): string {
	const value = argv[index + 1]
	if (value === undefined) fail(`${flag} needs a value`, USAGE)
	return value
}

function requireIso(value: string | null, flag: string): void {
	if (value !== null && Number.isNaN(Date.parse(value))) {
		fail(`${flag} is not an ISO timestamp: ${value}`, USAGE)
	}
}

function applyFlag(options: UsageOptions, argv: readonly string[], index: number): number {
	const arg = argv[index] ?? ""
	const key = FLAGS[arg]
	if (key === undefined) return index
	options[key] = valueAfter(argv, index, arg)
	return index + 1
}

/** Parses the usage arguments; `--machine` defaults to a hash alias of this host's name. */
export function parseUsageArgs(argv: readonly string[]): UsageOptions {
	const options: UsageOptions = {
		machine: machineAlias(hostname()),
		since: null,
		mistralCsv: null,
		skipOpenCodeBefore: null,
	}
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i] ?? ""
		if (arg === "--help" || arg === "-h") {
			console.log(USAGE)
			process.exit(0)
		}
		const next = applyFlag(options, argv, i)
		if (next === i) fail(`Unknown argument: ${arg}`, USAGE)
		i = next
	}
	requireIso(options.since, "--since")
	requireIso(options.skipOpenCodeBefore, "--skip-opencode-before")
	return options
}

/** Collects, filters and prints usage rows as JSON lines. */
export function runUsageCommand(argv: readonly string[]): void {
	const { skipOpenCodeBefore, ...collectOptions } = parseUsageArgs(argv)
	let rows = collectUsage(collectOptions)
	if (skipOpenCodeBefore !== null) rows = dropOpenCodeBefore(rows, skipOpenCodeBefore)
	const { rows: kept, dropped } = dropUnknownPlans(rows)
	if (dropped > 0) console.error(`usage: dropped ${dropped} row(s) with plan unknown`)
	for (const row of kept) console.log(JSON.stringify(row))
}
