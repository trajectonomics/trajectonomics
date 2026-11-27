import { BLOG_BASE, SITE_ORIGIN } from "./site"

/** The host the blog moved from on 2026-11-27; it answers with a permanent redirect. */
export const OLD_BLOG_HOST = "blog.trajectonomics.com"

/**
 * The absolute URL of the same page under the Site's blog path, or `undefined` when the URL is on
 * another host. A path already under the blog's base is kept as it is, so no page gets it twice.
 */
export function movedBlogUrl(url: URL): string | undefined {
	if (url.hostname !== OLD_BLOG_HOST) return undefined
	const path =
		url.pathname === BLOG_BASE || url.pathname.startsWith(`${BLOG_BASE}/`)
			? url.pathname
			: `${BLOG_BASE}${url.pathname}`
	return `${SITE_ORIGIN}${path}${url.search}`
}

/**
 * The permanent redirect of an old-host GET or HEAD, or `undefined` when the request is served as
 * before: another host keeps serving, and a method other than GET or HEAD is left to the assets.
 */
export function oldHostRedirect(request: Request): Response | undefined {
	if (request.method !== "GET" && request.method !== "HEAD") return undefined
	const location = movedBlogUrl(new URL(request.url))
	if (location === undefined) return undefined
	return new Response(null, { status: 301, headers: { location } })
}
