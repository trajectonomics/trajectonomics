import type { CliRelease, HelpEntry } from "./cli-release"
import type { ContentFile } from "./content-pages"
import { CODE_TOKEN, problem, type ReleaseFactProblem } from "./release-fact-types"

/** A row of the command table: `| [name](/cli/commands/name/) | summary |`. */
const COMMAND_ROW = /^\|\s*\[([a-z-]+)\]\([^)]*\)\s*\|\s*(.+?)\s*\|\s*$/

/** The command table's rows, in page order. */
function commandRows(content: string): readonly HelpEntry[] {
	return content.split("\n").flatMap((line) => {
		const match = COMMAND_ROW.exec(line)
		return match?.[1] === undefined || match[2] === undefined
			? []
			: [{ name: match[1], summary: match[2] }]
	})
}

/** The command table against the root help's commands: a missing row, an unknown row, a summary. */
export function commandTableProblems(
	file: ContentFile,
	release: CliRelease,
): readonly ReleaseFactProblem[] {
	const rows = commandRows(file.content)
	const released = new Map(release.commands.map((command) => [command.name, command.summary]))
	const listed = new Set(rows.map((row) => row.name))
	const missing = release.commands
		.filter((command) => !listed.has(command.name))
		.map((command) =>
			problem("command-missing", file.path, `the table has no row for \`${command.name}\``),
		)
	const stated = rows.flatMap((row) => {
		const summary = released.get(row.name)
		if (summary === undefined) {
			return [problem("command-unknown", file.path, `\`${row.name}\` is not a released command`)]
		}
		const detail = `\`${row.name}\` reads "${row.summary}"; traj help says "${summary}"`
		return summary === row.summary ? [] : [problem("command-summary", file.path, detail)]
	})
	return [...missing, ...stated]
}

/** The `0` ok, `1` unexpected … line under `## Exit codes`, as entries. */
function exitCodeLine(content: string): readonly HelpEntry[] | undefined {
	const section = /^## Exit codes\n+(.+)$/m.exec(content)?.[1]
	if (section === undefined) return undefined
	return [...section.matchAll(/`(\d+)`\s+([^,.]+)/g)].map((match) => ({
		name: match[1] ?? "",
		summary: (match[2] ?? "").trim(),
	}))
}

/** The `## Exit codes` line against the root help's. */
export function exitCodeProblems(
	file: ContentFile,
	release: CliRelease,
): readonly ReleaseFactProblem[] {
	const written = (entries: readonly HelpEntry[]) =>
		entries.map((entry) => `\`${entry.name}\` ${entry.summary}`).join(", ")
	const stated = exitCodeLine(file.content)
	const actual = stated === undefined ? "no exit codes" : written(stated)
	const expected = written(release.exitCodes)
	const detail = `states ${actual}; traj help says ${expected}`
	return actual === expected ? [] : [problem("exit-codes", file.path, detail)]
}

/** The codes the paragraph that says "worth retrying" names. */
function retryableStated(content: string): readonly string[] {
	const paragraph = content.split(/\n\s*\n/).find((block) => /worth retrying/.test(block)) ?? ""
	return [...paragraph.matchAll(CODE_TOKEN)].map((match) => match[1] ?? "")
}

/** The "worth retrying" paragraph against the registry's retryable codes. */
export function retryableProblems(
	file: ContentFile,
	release: CliRelease,
): readonly ReleaseFactProblem[] {
	const stated = [...retryableStated(file.content)].sort().join(", ")
	const expected = release.errors
		.filter((error) => error.retryable)
		.map((error) => error.code)
		.sort()
		.join(", ")
	const detail = `names ${stated || "no retryable codes"}; the registry marks ${expected}`
	return stated === expected ? [] : [problem("retryable-codes", file.path, detail)]
}
