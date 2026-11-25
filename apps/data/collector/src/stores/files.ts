import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

/** Lists files under `root` that match, relative paths resolved and sorted; missing roots are empty. */
export function listFiles(root: string, match: (path: string) => boolean): string[] {
	if (!existsSync(root)) return []
	try {
		return readdirSync(root, { recursive: true, encoding: "utf8" })
			.map((relative) => join(root, relative))
			.filter(match)
			.sort()
	} catch {
		return []
	}
}

/** Reads a file lazily, one non-empty line at a time. */
export function* readLines(path: string): Generator<string> {
	const text = readFileSync(path, "utf8")
	for (const line of text.split("\n")) {
		if (line.trim().length > 0) yield line
	}
}
