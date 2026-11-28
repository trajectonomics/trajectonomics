import { DOCS_BASE_PATH } from "../tabs"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { anchors } from "./html"

/** The URL path of `href`, without its query or fragment. */
function urlPath(href: string): string {
	const end = href.search(/[?#]/)
	return end === -1 ? href : href.slice(0, end)
}

/** Whether a URL path's last segment names a file, which Static Assets serves without a slash. */
function namesFile(path: string): boolean {
	return /\.[^/]+$/.test(path)
}

/**
 * Whether `href` is a link to a Portal page whose path lacks the slash Static Assets serves it
 * under, so the click answers a 307 redirect (trajectonomics#46).
 */
function lacksTrailingSlash(href: string): boolean {
	if (href !== DOCS_BASE_PATH && !href.startsWith(`${DOCS_BASE_PATH}/`)) return false
	const path = urlPath(href)
	return !path.endsWith("/") && !namesFile(path)
}

/**
 * Failures for built pages that link a Portal page without its trailing slash. A file the Portal
 * serves as it is (`/docs/llms.txt`, `/docs/sitemap.xml`, `/docs/cli.md`) is not a page and is left
 * alone, and so is a link outside the Portal.
 */
export function checkInternalLinks(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return files.flatMap((file) => {
		if (!file.path.endsWith(".html")) return []
		const reported = new Set<string>()
		return anchors(file.content).flatMap((link) => {
			const href = link.href
			if (href === undefined || reported.has(href) || !lacksTrailingSlash(href)) return []
			reported.add(href)
			return [
				buildFailure(
					"PORTAL_LINK_WITHOUT_SLASH",
					file.path,
					`the page links ${href} without its trailing slash, so the click costs a 307 redirect`,
				),
			]
		})
	})
}
