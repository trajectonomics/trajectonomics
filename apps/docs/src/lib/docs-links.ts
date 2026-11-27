import type { HastNode, HastPlugin } from "./hast"
import { DOCS_BASE_PATH } from "./tabs"

/** Paths on the Site, outside the Portal, that a root-relative link may name. */
const SITE_PATHS = ["/blog", "/data"] as const

/** Whether `href` already names `path` or something under it, query or fragment included. */
function names(href: string, path: string): boolean {
	return (
		href === path ||
		href.startsWith(`${path}/`) ||
		href.startsWith(`${path}?`) ||
		href.startsWith(`${path}#`)
	)
}

/**
 * `href` with the Portal's base path added when it is a root-relative link into the Portal.
 *
 * The Site Home (`/`), the blog (`/blog/...`) and the data site (`/data/...`) stay at the Site's
 * root; a link that already carries `/docs` is not prefixed twice (ADR 0017).
 */
export function withDocsBase(href: string): string {
	if (!href.startsWith("/") || href.startsWith("//")) return href
	for (const path of [DOCS_BASE_PATH, ...SITE_PATHS]) {
		if (names(href, path)) return href
	}
	if (names(href, "/")) return href
	return `${DOCS_BASE_PATH}${href}`
}

/**
 * The hast plugin that puts authored root-relative links under the Portal's base, so a link written
 * as `/cli/...` reaches `/docs/cli/...` in the built page.
 */
export function prefixDocsLinks(): HastPlugin {
	return {
		name: "docs-prefix-internal-links",
		element: {
			filter: ["a"],
			visit(node: HastNode, context) {
				const href = node.properties?.["href"]
				if (typeof href !== "string") return
				const prefixed = withDocsBase(href)
				if (prefixed === href) return
				context.replaceNode(node, {
					...node,
					properties: { ...node.properties, href: prefixed },
				})
			},
		},
	}
}
