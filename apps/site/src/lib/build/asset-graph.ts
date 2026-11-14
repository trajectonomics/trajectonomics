import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"

/** The files one walk reached, and the same-origin paths the build did not produce. */
export interface AssetGraph {
	readonly files: readonly BuiltFile[]
	readonly missing: readonly string[]
}

/** Walk from `start`, following `next` over each found file, counting every path once. */
export function walkAssets(
	files: readonly BuiltFile[],
	start: readonly string[],
	next: (file: BuiltFile) => readonly string[],
): AssetGraph {
	const queue = [...start]
	const found: BuiltFile[] = []
	const missing: string[] = []
	const seen = new Set<string>()
	while (queue.length > 0) {
		const path = queue.shift() ?? ""
		if (path === "" || seen.has(path)) continue
		seen.add(path)
		const file = fileAt(files, path)
		if (file === undefined) {
			missing.push(path)
			continue
		}
		found.push(file)
		queue.push(...next(file))
	}
	return Object.freeze({ files: Object.freeze(found), missing: Object.freeze(missing) })
}
