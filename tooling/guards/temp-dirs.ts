/** A tracked file as the guard reads it. */
export interface SourceFile {
	readonly path: string
	readonly text: string
}

const SOURCE = /\.(?:[cm]?[jt]s|tsx)$/
const SKIPPED = /(?:^|\/)(?:node_modules|dist|\.astro|\.agents|\.claude|\.vibe|\.grok)\//
const MAKES = /\bmkdtemp(?:Sync)?\s*\(/
const REMOVES = /\b(?:rm|rmSync)\s*\(/

/**
 * The escape hatch: files whose temporary directory a helper elsewhere removes, so no `rm` or
 * `rmSync` appears in the file itself. Each entry pairs the path with the removal it relies on, so
 * an allow-listed file says why it is exempt rather than only that it is (#544).
 */
export const ALLOWED: ReadonlyMap<string, string> = new Map<string, string>([])

/** Whether the guard reads this tracked path: source code outside build output and vendored skills. */
export function isChecked(path: string): boolean {
	return SOURCE.test(path) && !SKIPPED.test(path)
}

/** The file's text without its comments, so an `rm` mentioned in prose is not a removal. */
function withoutComments(text: string): string {
	return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

/**
 * The files that make a temporary directory with `mkdtemp` or `mkdtempSync` and never call `rm` or
 * `rmSync`, so a run leaves the directory behind (#544). A file named in `allowed` is exempt, and
 * only an `rm` in code counts: one in a line comment, a block comment or a JSDoc comment does not.
 */
export function unremovedTempDirs(
	files: readonly SourceFile[],
	allowed: ReadonlyMap<string, string> = ALLOWED,
): string[] {
	return files
		.filter((file) => MAKES.test(file.text) && !REMOVES.test(withoutComments(file.text)))
		.map((file) => file.path)
		.filter((path) => !allowed.has(path))
}
