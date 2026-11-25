#!/usr/bin/env bun
import { hostname } from "node:os"
import { type CollectOptions, collectUsage } from "./collect"

const USAGE = "Usage: bun src/cli.ts [--since <ISO>] [--machine <name>] [--mistral-csv <path>]"

function fail(message: string): never {
	console.error(`${message}\n${USAGE}`)
	process.exit(1)
}

function valueAfter(argv: readonly string[], index: number, flag: string): string {
	const value = argv[index + 1]
	if (value === undefined) fail(`${flag} needs a value`)
	return value
}

const FLAGS: Record<string, "since" | "machine" | "mistralCsv"> = {
	"--since": "since",
	"--machine": "machine",
	"--mistral-csv": "mistralCsv",
}

/** Parses the CLI arguments; `--machine` defaults to this host's name. */
export function parseArgs(argv: readonly string[]): CollectOptions {
	const options: CollectOptions = { machine: hostname(), since: null, mistralCsv: null }
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i] ?? ""
		if (arg === "--help" || arg === "-h") {
			console.log(USAGE)
			process.exit(0)
		}
		const key = FLAGS[arg]
		if (key === undefined) fail(`Unknown argument: ${arg}`)
		options[key] = valueAfter(argv, i, arg)
		i += 1
	}
	if (options.since !== null && Number.isNaN(Date.parse(options.since))) {
		fail(`--since is not an ISO timestamp: ${options.since}`)
	}
	return options
}

if (import.meta.main) {
	const options = parseArgs(process.argv.slice(2))
	for (const row of collectUsage(options)) console.log(JSON.stringify(row))
}
