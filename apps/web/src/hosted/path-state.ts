import {
	type PathInput,
	type PathResolution,
	resolvePath as resolveLoopbackPath,
} from "../lib/view/chance/path-state"

export * from "../lib/view/chance/path-state"

/**
 * What the page shows for a future. The hosted build cannot read one live, so it holds to the futures the Demo snapshot
 * read in advance, and says a live dashboard opens the rest.
 */
export function resolvePath(input: PathInput): PathResolution {
	return resolveLoopbackPath({ ...input, canRead: false })
}
