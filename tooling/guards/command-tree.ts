import { dirname, join } from "node:path"

/** Reads one repository file as text, or `undefined` when the file is not there. */
export type SourceReader = (path: string) => string | undefined

/** The file the CLI's command tree starts at, from the repository root. */
export const ROOT_INDEX = "apps/cli/src/commands/index.ts"

/** Where the CLI lists the flags every leaf takes, whatever its own options say. */
export const GLOBAL_OPTIONS = "apps/cli/src/usage.ts"

/** A node of the command tree, read out of the file that defines it. */
export type Node = { readonly file: string; readonly kind: "group" | "leaf" }

/**
 * A quoted string of one line of the CLI's source. The double- and single-quoted forms stop at a
 * newline, so an apostrophe in prose cannot pair with one on a later line and swallow code.
 */
const STRING = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g

/** The source each `import { name } from "./p"` line binds, keyed by the name it binds. */
function importsOf(text: string): ReadonlyMap<string, string> {
	const imports = new Map<string, string>()
	for (const line of text.matchAll(/^import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"(\.[^"]*)"/gm)) {
		for (const name of (line[1] ?? "").split(",")) {
			const local =
				name
					.trim()
					.replace(/^type\s+/, "")
					.split(/\s+as\s+/)
					.at(-1) ?? ""
			if (local !== "") imports.set(local, line[2] ?? "")
		}
	}
	return imports
}

/** The names a group lists in its `children: [ ... ]` array, however it wraps them. */
function childrenOf(text: string): readonly string[] {
	const array = /children:\s*\[([^\]]*)\]/.exec(text)?.[1] ?? ""
	return [...array.matchAll(/[A-Za-z_$][\w$]*/g)].map(([name = ""]) => name)
}

/** The index of the `}` matching the `{` at `from`, counting no brace inside a quoted string. */
function closeOf(text: string, from: number): number {
	const rest = text.slice(from).replace(STRING, (string) => " ".repeat(string.length))
	let depth = 0
	for (let at = 0; at < rest.length; at += 1) {
		if (rest[at] === "{") depth += 1
		if (rest[at] !== "}") continue
		depth -= 1
		if (depth === 0) return from + at
	}
	return text.length
}

/** What a file's `defineCommand` or `defineGroup` call is, when the `name` it carries is `token`. */
function kindOf(text: string, token: string): "group" | "leaf" | undefined {
	const call = /\bdefine(Command|Group)\(\s*\{/.exec(text)
	if (call === null) return undefined
	const body = text.slice(call.index, closeOf(text, call.index + call[0].length - 1))
	if (!new RegExp(String.raw`\bname:\s*"${token}"`).test(body)) return undefined
	return call[1] === "Group" ? "group" : "leaf"
}

/** The object a leaf's `input: z.object({ ... })` declares, which is where its own flags are keys. */
export function optionsOf(text: string): string {
	const open = /input:\s*z\.\w+\(\s*\{/.exec(text)
	if (open === null) return ""
	const at = open.index + open[0].length - 1
	return text.slice(at, closeOf(text, at) + 1)
}

/** The kind of node `file` is, when its definition carries `token` as its name. */
function kindAt(file: string, token: string, read: SourceReader): Node["kind"] | undefined {
	const text = read(file)
	return text === undefined ? undefined : kindOf(text, token)
}

/** The file a group's child lives in, found through the word the group names it by. */
export function childOf(group: string, token: string, read: SourceReader): Node | undefined {
	const text = read(group) ?? ""
	const imports = importsOf(text)
	for (const name of childrenOf(text)) {
		const source = imports.get(name)
		if (source === undefined) continue
		const base = join(dirname(group), source)
		for (const file of [`${base}.ts`, join(base, "index.ts")]) {
			const kind = kindAt(file, token, read)
			if (kind !== undefined) return { file, kind }
		}
	}
	return undefined
}
