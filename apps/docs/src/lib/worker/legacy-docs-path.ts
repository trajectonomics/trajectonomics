import { APEX_ORIGIN, SITE_ORIGIN } from "../site"
import { retiredPathTarget } from "./retired-paths"

/** The path prefix the Docs Portal used when it was mounted on the apex. */
export const LEGACY_DOCS_PREFIX = "/docs"

const APEX_HOSTS = new Set([new URL(APEX_ORIGIN).hostname, `www.${new URL(APEX_ORIGIN).hostname}`])

/**
 * Where a request for the old `/docs` mount should go, or `null` when the path is not that mount.
 *
 * A request that still arrives on trajectonomics.com (the router forwards `/docs` unchanged) is sent
 * to this host. A request that already names this host, or a preview host, stays there and only
 * loses the prefix. A retired path under the prefix resolves in the same redirect.
 */
export function legacyDocsLocation(url: URL): string | null {
	const { pathname } = url
	if (pathname !== LEGACY_DOCS_PREFIX && !pathname.startsWith(`${LEGACY_DOCS_PREFIX}/`)) return null
	const stripped = pathname === LEGACY_DOCS_PREFIX ? "/" : pathname.slice(LEGACY_DOCS_PREFIX.length)
	const nextPath = retiredPathTarget(stripped) ?? (stripped.length === 0 ? "/" : stripped)
	const origin = APEX_HOSTS.has(url.hostname) ? SITE_ORIGIN : url.origin
	return `${origin}${nextPath}${url.search}`
}
