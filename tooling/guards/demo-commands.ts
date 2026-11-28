import { childOf, GLOBAL_OPTIONS, optionsOf, ROOT_INDEX, type SourceReader } from "./command-tree"

/** One demo line as the walker reads it: the words that name a command, and the flags it takes. */
type ParsedLine = { readonly path: readonly string[]; readonly flags: readonly string[] }

/** The flag name a line spells, in the camelCase an option key uses: `as-of` becomes `asOf`. */
const camel = (flag: string) =>
	flag.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())

/** The words that name the command and the flags that follow it; a redirection target is not read. */
function parseLine(line: string): ParsedLine {
	const tokens = line.trim().split(/\s+/).slice(1)
	const cut = tokens.findIndex((token) => /^[-|>]/.test(token))
	const words = cut === -1 ? tokens : tokens.slice(0, cut)
	const flags = tokens
		.filter((token) => /^--[a-z][a-z0-9-]*$/.test(token))
		.map((token) => token.slice(2))
	return { path: words.filter((word) => !word.startsWith("-")), flags }
}

/** Why a leaf takes no one of the line's flags, or `undefined` when it takes every one of them. */
function flagProblem(
	command: string,
	leaf: string,
	line: ParsedLine,
	read: SourceReader,
): string | undefined {
	const options = optionsOf(read(leaf) ?? "")
	const global = /GLOBAL_OPTIONS[^=]*=\s*\[([\s\S]*?)\]/.exec(read(GLOBAL_OPTIONS) ?? "")?.[1] ?? ""
	for (const flag of line.flags) {
		if (new RegExp(String.raw`\b${camel(flag)}\s*:`).test(options)) continue
		if (new RegExp(String.raw`--${flag}\b`).test(global)) continue
		return `\`${command}\`: \`${leaf}\` has no \`--${flag}\` option.`
	}
	return undefined
}

/** Why a demo line names a command the CLI does not define, or `undefined` when it names a real one. */
export function demoCommandProblem(command: string, read: SourceReader): string | undefined {
	const line = parseLine(command)
	if (line.path.length === 0) return `\`${command}\` names no command.`
	let group = ROOT_INDEX
	for (const token of line.path) {
		const child = childOf(group, token, read)
		if (child === undefined) return `\`${command}\`: \`${group}\` defines no \`${token}\`.`
		if (child.kind === "leaf") return flagProblem(command, child.file, line, read)
		group = child.file
	}
	return `\`${command}\`: \`${group}\` is a group, so the line names no command of its own.`
}
