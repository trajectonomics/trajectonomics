import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
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

/**
 * Lists matching files whose mtime is at or after `sinceMs`; a null cutoff keeps every file.
 * It lets a `--since` run avoid opening files whose last write predates the window.
 */
export function listRecentFiles(
	root: string,
	match: (path: string) => boolean,
	sinceMs: number | null,
): string[] {
	const paths = listFiles(root, match)
	if (sinceMs === null) return paths
	return paths.filter((path) => {
		try {
			return statSync(path).mtimeMs >= sinceMs
		} catch {
			return false
		}
	})
}

/** Reads a file lazily, one non-empty line at a time. */
export function* readLines(path: string): Generator<string> {
	const text = readFileSync(path, "utf8")
	for (const line of text.split("\n")) {
		if (line.trim().length > 0) yield line
	}
}
