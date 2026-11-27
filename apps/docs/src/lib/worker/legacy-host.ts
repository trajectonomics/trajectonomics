import { SITE_ORIGIN } from "../site"
import { DOCS_BASE_PATH } from "../tabs"
import { retiredPathTarget } from "./retired-paths"

/** The host the Docs Portal left on 2026-11-27. Every read there now redirects to the Site (ADR 0017). */
export const LEGACY_HOST = "docs.trajectonomics.com"

/** Whether `pathname` already carries the Portal's base path. */
function hasBase(pathname: string): boolean {
	return pathname === DOCS_BASE_PATH || pathname.startsWith(`${DOCS_BASE_PATH}/`)
}

/**
 * Where a request for the old Docs host should go, or `null` when it is not that host.
 *
 * A read on `docs.trajectonomics.com` answers a permanent redirect to the same path under the
 * Site's `/docs` mount, query string kept. A path that already carries the prefix is not prefixed
 * twice, and a retired `/developers` path resolves to its final target in the same hop.
 */
export function legacyHostLocation(url: URL): string | null {
	if (url.hostname !== LEGACY_HOST) return null
	const prefixed = hasBase(url.pathname)
		? url.pathname
		: `${DOCS_BASE_PATH}${url.pathname === "/" ? "/" : url.pathname}`
	const pathname = retiredPathTarget(prefixed) ?? prefixed
	return `${SITE_ORIGIN}${pathname}${url.search}`
}
