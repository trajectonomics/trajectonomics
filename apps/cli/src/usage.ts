import type { Group, Leaf, Node } from "./command"
import { usageLines } from "./document-usage"
import { exitUsage } from "./exit-usage"
import { sortedByName } from "./tree"
import { flagLabel, flagNote, table } from "./usage-labels"

const GLOBAL_OPTIONS: readonly (readonly [string, string])[] = [
	["--json", "Print JSON; errors become a JSON envelope on stderr"],
	["-h, --help", "Show usage"],
	["-v, --version", "Print the version"],
]

const ENVIRONMENT: readonly (readonly [string, string])[] = [
	["TRAJ_FORMAT", "human (default) or json; --json takes precedence"],
	["TRAJ_HOME", "Data directory (default ~/.traj)"],
	["TRAJ_DEBUG", "Set to 1 to print diagnostics for unexpected errors"],
	["TRAJ_TELEMETRY", "0, off or false stops the anonymous usage count (see traj telemetry)"],
	["DO_NOT_TRACK", "Any value but empty, 0 or false stops the anonymous usage count"],
]

function groupUsage(group: Group, path: readonly string[]): string {
	const rows = sortedByName(group.children).map((child) => [child.name, child.summary] as const)
	const isRoot = path.length === 0
	return [
		`Usage: traj ${[...path, "<command>"].join(" ")} [options]`,
		...(isRoot ? [] : ["", group.summary, ...(group.note === undefined ? [] : ["", group.note])]),
		"",
		"Commands:",
		...table(rows),
		...(isRoot
			? [
					...exitUsage(),
					"",
					"Options:",
					...table(GLOBAL_OPTIONS),
					"",
					"Environment:",
					...table(ENVIRONMENT),
				]
			: []),
	].join("\n")
}

function leafUsage(leaf: Leaf, path: readonly string[]): string {
	const own = leaf.flags.map((spec) => [flagLabel(spec), flagNote(spec)] as const)
	const examples = leaf.examples.map((example) => [example.command, example.description] as const)
	const usage = usageLines(leaf, path)
	return [
		...usage,
		"",
		leaf.summary,
		...(leaf.description === undefined ? [] : ["", leaf.description]),
		...(leaf.note === undefined ? [] : ["", leaf.note]),
		...(own.length > 0 ? ["", "Options:", ...table(own)] : []),
		"",
		"Global options:",
		...table(GLOBAL_OPTIONS),
		...(examples.length > 0 ? ["", "Examples:", ...table(examples)] : []),
	].join("\n")
}

/** The usage text of a node, built from its schemas so it cannot drift from what is accepted. */
export function usageOf(node: Node, path: readonly string[]): string {
	return node.kind === "group" ? groupUsage(node, path) : leafUsage(node, path)
}
