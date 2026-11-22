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
 * The longest command name (from `traj schema`) the call's leading words spell, as `""` for the
 * root. Words that start with `-` end the command name.
 */
export function commandPathOf(argv: readonly string[], commandNames: readonly string[]): string {
	const words: string[] = []
	for (const word of argv) {
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

/** Flags a call used that its command's help does not list: the invented ones. */
export function inventedFlagsOf(
	argv: readonly string[],
	commandNames: readonly string[],
	table: FlagTable,
): string[] {
	const path = commandPathOf(argv, commandNames)
	const known = table[path] ?? new Set<string>()
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
