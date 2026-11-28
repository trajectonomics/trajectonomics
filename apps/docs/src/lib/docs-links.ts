import type { HastNode, HastPlugin } from "./hast"
import { DOCS_BASE_PATH } from "./tabs"

/** Paths on the Site, outside the Portal, that a root-relative link may name. */
const SITE_PATHS = ["/blog", "/data"] as const

/** Whether a root-relative `href` names a Site path outside the Portal: the blog or the data site. */
export function namesSitePath(href: string): boolean {
	return SITE_PATHS.some((path) => names(href, path))
}

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
 * Whether a URL path names a file the Portal serves as it is, such as `/docs/llms.txt`, rather than
 * a page. Only these extensions count, so a dotted page slug such as `/docs/cli/v0.7` is a page.
 */
function namesFile(path: string): boolean {
	return /\.(md|txt|xml|json|js|css|png|jpe?g|gif|svg|webp|ico|woff2?)$/i.test(path)
}

/** The URL path of `href`, without its query or fragment. */
function urlPath(href: string): string {
	const end = href.search(/[?#]/)
	return end === -1 ? href : href.slice(0, end)
}

/**
 * Whether `href` links a Portal page without the trailing slash Static Assets serves it under, so a
 * click costs a 307 redirect (trajectonomics#46). A file, a link outside the Portal and a path that
 * already ends in a slash do not.
 */
export function lacksPortalSlash(href: string): boolean {
	if (!names(href, DOCS_BASE_PATH)) return false
	const path = urlPath(href)
	return !path.endsWith("/") && !namesFile(path)
}

/**
 * `href` with the trailing slash its Portal page is served under, so a click reaches the page
 * instead of the 307 redirect Static Assets answers a slashless path with (trajectonomics#46).
 *
 * A query or fragment stays after the slash. A link outside the Portal, one whose path already ends
 * in a slash, and a file such as `/docs/llms.txt` or `/docs/cli.md` are returned unchanged.
 */
export function withPortalSlash(href: string): string {
	if (!lacksPortalSlash(href)) return href
	const path = urlPath(href)
	return `${path}/${href.slice(path.length)}`
}

/**
 * `href` with the Portal's base path added when it is a root-relative link into the Portal, and with
 * the trailing slash its page is served under.
 *
 * The Site Home (`/`), the blog (`/blog/...`) and the data site (`/data/...`) stay at the Site's
 * root; a link that already carries `/docs` is not prefixed twice (ADR 0017).
 */
export function withDocsBase(href: string): string {
	if (!href.startsWith("/") || href.startsWith("//")) return href
	for (const path of [DOCS_BASE_PATH, ...SITE_PATHS]) {
		if (names(href, path)) return withPortalSlash(href)
	}
	if (names(href, "/")) return href
	return withPortalSlash(`${DOCS_BASE_PATH}${href}`)
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
