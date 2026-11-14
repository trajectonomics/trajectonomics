import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** The router serves this path itself, so the Site must never build a file there. */
const RESERVED_PRELOAD_PATH = "__mf-preload.js"

/** The Reserved preload path stays the router's, in the build as in the router ([ADR 0002]). */
export function checkReservedPreloadPath(files: readonly BuiltFile[]): readonly BuildFailure[] {
	if (fileAt(files, RESERVED_PRELOAD_PATH) === undefined) return []
	return [
		buildFailure(
			"RESERVED_PRELOAD_PATH_BUILT",
			RESERVED_PRELOAD_PATH,
			"the Reserved preload path belongs to the router and must not be built here.",
		),
	]
}
