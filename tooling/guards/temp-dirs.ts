/** A tracked file as the guard reads it. */
export interface SourceFile {
	readonly path: string
	readonly text: string
}

const SOURCE = /\.(?:[cm]?[jt]s|tsx)$/
const SKIPPED = /(?:^|\/)(?:node_modules|dist|\.astro|\.agents|\.claude|\.vibe|\.grok)\//
const MAKES = /\bmkdtemp(?:Sync)?\s*\(/
const REMOVES = /\b(?:rm|rmSync)\s*\(/

/** Whether the guard reads this tracked path: source code outside build output and vendored skills. */
export function isChecked(path: string): boolean {
	return SOURCE.test(path) && !SKIPPED.test(path)
}

/**
 * The files that make a temporary directory with `mkdtemp` or `mkdtempSync` and never call `rm` or
 * `rmSync`, so a run leaves the directory behind (#544).
 */
export function unremovedTempDirs(files: readonly SourceFile[]): string[] {
	return files
		.filter((file) => MAKES.test(file.text) && !REMOVES.test(file.text))
		.map((file) => file.path)
}
