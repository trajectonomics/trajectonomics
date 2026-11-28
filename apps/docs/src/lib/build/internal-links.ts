import { lacksPortalSlash } from "../docs-links"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { anchors } from "./html"

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
			if (href === undefined || reported.has(href) || !lacksPortalSlash(href)) return []
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
