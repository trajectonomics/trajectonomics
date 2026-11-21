import type { ReleaseLeaf, ReleaseSnapshot } from "./command-reference"

/** Where the committed snapshot of the latest `traj` release lives, relative to `apps/docs`. */
export const CLI_RELEASE_PATH = "src/generated/cli-release.json"

/** One line of a root-help section: a top-level command, an exit code or a variable, and its text. */
export interface HelpEntry {
	readonly name: string
	readonly summary: string
}

/** One code of the released error registry. */
export interface ReleaseError {
	readonly code: string
	readonly exitCode: number
	readonly retryable: boolean
}

/**
 * The latest `traj` release as the Docs Portal records it (ADR 0015): its leaves and global flags
 * for the command-reference rules, and the root help's commands, exit codes and environment with
 * the error registry for the release-fact rules. `bun run snapshot:cli` writes it; nothing else does.
 */
export interface CliRelease extends ReleaseSnapshot {
	readonly commands: readonly HelpEntry[]
	readonly exitCodes: readonly HelpEntry[]
	readonly environment: readonly HelpEntry[]
	readonly errors: readonly ReleaseError[]
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined
}

/**
 * The entries under `heading:` in `traj help`'s root text: indented `name  summary` lines up to the
 * first blank line. An absent section is empty.
 */
export function helpSection(help: string, heading: string): readonly HelpEntry[] {
	const lines = help.split("\n")
	const start = lines.findIndex((line) => line.trim() === `${heading}:`)
	if (start === -1) return []
	const entries: HelpEntry[] = []
	for (const line of lines.slice(start + 1)) {
		if (line.trim() === "") break
		const match = /^\s+(\S+)\s{2,}(.+?)\s*$/.exec(line)
		if (match?.[1] === undefined || match[2] === undefined) break
		entries.push({ name: match[1], summary: match[2] })
	}
	return entries
}

/** The error registry `traj schema --json` prints, in its order. */
export function errorsOf(schema: unknown): readonly ReleaseError[] {
	const errors = asRecord(schema)?.["errors"]
	if (!Array.isArray(errors)) throw new Error("`schema --json` did not print an error registry")
	return errors.map((entry) => {
		const record = asRecord(entry)
		const code = record?.["code"]
		const exitCode = record?.["exitCode"]
		const retryable = record?.["retryable"]
		if (
			typeof code !== "string" ||
			typeof exitCode !== "number" ||
			typeof retryable !== "boolean"
		) {
			throw new Error("`schema --json` printed an error without code, exitCode and retryable")
		}
		return { code, exitCode, retryable }
	})
}

function entriesOf(value: unknown, field: string): readonly HelpEntry[] {
	if (!Array.isArray(value)) throw new Error(`the CLI release snapshot has no ${field} list`)
	return value.map((entry) => {
		const record = asRecord(entry)
		const name = record?.["name"]
		const summary = record?.["summary"]
		if (typeof name !== "string" || typeof summary !== "string") {
			throw new Error(`the CLI release snapshot has a ${field} entry without name and summary`)
		}
		return { name, summary }
	})
}

function leavesOf(value: unknown): readonly ReleaseLeaf[] {
	if (!Array.isArray(value)) throw new Error("the CLI release snapshot has no leaves")
	return value.map((entry) => {
		const record = asRecord(entry)
		const name = record?.["name"]
		const flags = record?.["flags"]
		if (
			typeof name !== "string" ||
			!Array.isArray(flags) ||
			flags.some((flag) => typeof flag !== "string")
		) {
			throw new Error("the CLI release snapshot has a leaf without name and flags")
		}
		return { name, flags: flags as string[] }
	})
}

/** The snapshot file's JSON as a `CliRelease`, refusing a file of another shape. */
export function parseCliRelease(json: unknown): CliRelease {
	const record = asRecord(json)
	const version = record?.["version"]
	const globalFlags = record?.["globalFlags"]
	if (typeof version !== "string") throw new Error("the CLI release snapshot has no version")
	if (!Array.isArray(globalFlags) || globalFlags.some((flag) => typeof flag !== "string")) {
		throw new Error("the CLI release snapshot has no global flags")
	}
	return {
		version,
		leaves: leavesOf(record?.["leaves"]),
		globalFlags: globalFlags as string[],
		commands: entriesOf(record?.["commands"], "commands"),
		exitCodes: entriesOf(record?.["exitCodes"], "exitCodes"),
		environment: entriesOf(record?.["environment"], "environment"),
		errors: errorsOf({ errors: record?.["errors"] }),
	}
}
