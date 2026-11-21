import { twinPath } from "../agent/twin-path"
import { DOCS_BASE_PATH } from "../tabs"
import { LEGACY_DOCS_PREFIX } from "./legacy-docs-path"

/** The Markdown twin a page URL negotiates, or null when the path is not a page URL. */
export function pageTwinPath(pathname: string): string | null {
	// The old /docs prefix is a redirect, and any path without a trailing slash is not a page URL.
	if (pathname === LEGACY_DOCS_PREFIX || pathname.startsWith(`${LEGACY_DOCS_PREFIX}/`)) return null
	if (!pathname.endsWith("/")) return null
	if (DOCS_BASE_PATH.length > 0 && !pathname.startsWith(`${DOCS_BASE_PATH}/`)) return null
	return twinPath(pathname)
}
