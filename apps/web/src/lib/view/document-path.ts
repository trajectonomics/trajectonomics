/**
 * A Scenario document path in the CLI's dotted grammar (cli ADR-0024): object keys and list ids joined by `.`, where a
 * literal `.`, `\` or `=` in a key is escaped with `\`. A refusal's path names the Scenario as `document.…`.
 */

/** The segments of a dotted path: an unescaped `.` separates, and `\.`, `\\` and `\=` stand for `.`, `\` and `=`. */
export function splitPath(path: string): string[] {
	const segments: string[] = []
	let segment = ""
	for (let at = 0; at < path.length; at += 1) {
		const char = path[at] ?? ""
		const next = path[at + 1]
		if (char === "\\" && (next === "." || next === "\\" || next === "=")) {
			segment += next
			at += 1
		} else if (char === ".") {
			segments.push(segment)
			segment = ""
		} else {
			segment += char
		}
	}
	segments.push(segment)
	return segments
}

/** The dotted path of these segments, escaping a literal `.`, `\` or `=` in each. */
export function joinPath(segments: readonly string[]): string {
	return segments.map((segment) => segment.replace(/[.\\=]/g, (char) => `\\${char}`)).join(".")
}

/** The path within the Scenario document: the CLI's leading `document` key is not the form's to name. */
export function localPath(path: readonly string[]): readonly string[] {
	return path[0] === "document" ? path.slice(1) : path
}
