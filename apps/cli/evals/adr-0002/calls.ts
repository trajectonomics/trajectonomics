/** One `traj` call the wrapper logged: its arguments, its exit code and how long it ran. */
export interface Call {
	readonly argv: readonly string[]
	readonly exitCode: number
	readonly ms: number
}

/** The flags each command accepts, parsed from `traj help <command>`; the key `""` is the root. */
export type FlagTable = Readonly<Record<string, ReadonlySet<string>>>

const FLAG = /--[a-z][a-z0-9-]*/g

/** The `--flag` names a help text mentions. */
export function flagsIn(helpText: string): Set<string> {
	return new Set(helpText.match(FLAG) ?? [])
}

/**
 * The longest command name (from `traj schema`) the call's words spell, as `""` for the root. A
 * global flag (one the root help lists, such as `--json`) is skipped wherever it stands, the way
 * the CLI's own walk skips it; any other word that starts with `-` ends the command name.
 */
export function commandPathOf(
	argv: readonly string[],
	commandNames: readonly string[],
	globalFlags: ReadonlySet<string> = new Set(),
): string {
	const words: string[] = []
	for (const word of argv) {
		if (globalFlags.has(word)) continue
		if (word.startsWith("-")) break
		words.push(word)
	}
	let best = ""
	for (const name of commandNames) {
		const parts = name.split(" ")
		const matches = parts.every((part, index) => words[index] === part)
		if (matches && parts.length > best.split(" ").filter(Boolean).length) best = name
	}
	return best
}

/** The `--flag` names in a call, with any `=value` removed. */
export function flagsOfCall(argv: readonly string[]): string[] {
	return argv
		.filter((word) => word.startsWith("--") && word !== "--")
		.map((word) => word.split("=")[0] ?? word)
}

/**
 * Flags a call used that its command's help does not list: the invented ones. The root help's
 * flags are the global flags, which every command accepts, so they are known for every command.
 */
export function inventedFlagsOf(
	argv: readonly string[],
	commandNames: readonly string[],
	table: FlagTable,
): string[] {
	const globals = table[""] ?? new Set<string>()
	const path = commandPathOf(argv, commandNames, globals)
	const known = new Set([...globals, ...(table[path] ?? [])])
	return flagsOfCall(argv).filter((flag) => !known.has(flag))
}

/** Parses the wrapper's JSON lines; a malformed line is an error, not a silent skip. */
export function parseCallLog(text: string): Call[] {
	return text
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => {
			const raw: unknown = JSON.parse(line)
			if (typeof raw !== "object" || raw === null) throw new Error(`bad call log line: ${line}`)
			const record = raw as { argv?: unknown; exitCode?: unknown; ms?: unknown }
			if (!Array.isArray(record.argv) || typeof record.exitCode !== "number") {
				throw new Error(`bad call log line: ${line}`)
			}
			return {
				argv: record.argv.map(String),
				exitCode: record.exitCode,
				ms: typeof record.ms === "number" ? record.ms : 0,
			}
		})
}
