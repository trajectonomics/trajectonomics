import { twinPath } from "../agent/twin-path"
import { DOCS_BASE_PATH } from "../tabs"

/** The Markdown twin a page URL negotiates, or null when the path is not a page URL. */
export function pageTwinPath(pathname: string): string | null {
	// A page URL lives under the Portal's base and ends in a slash; anything else is a file.
	if (!pathname.endsWith("/")) return null
	if (DOCS_BASE_PATH.length > 0 && !pathname.startsWith(`${DOCS_BASE_PATH}/`)) return null
	return twinPath(pathname)
}
