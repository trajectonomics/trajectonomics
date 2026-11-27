import { DOCS_BASE_PATH } from "./tabs"

/**
 * The origin the Site is served from. The Docs Portal is served under `/docs` on it, beside the
 * blog and the data site (ADR 0017).
 */
export const SITE_ORIGIN = "https://trajectonomics.com"

/** The absolute URL base of the Docs Portal, the Site's origin under `/docs`, with no trailing slash. */
export const PORTAL_ORIGIN = `${SITE_ORIGIN}${DOCS_BASE_PATH}`

/** The part of a Portal path below the base: `/cli/` and `/docs/cli/` both become `cli`. */
function portalSlug(path: string): string {
	const slug = path.replace(/^\/+|\/+$/g, "")
	const base = DOCS_BASE_PATH.replace(/^\/+|\/+$/g, "")
	if (base.length === 0) return slug
	if (slug === base) return ""
	return slug.startsWith(`${base}/`) ? slug.slice(base.length + 1) : slug
}

/** The absolute URL of a Docs Portal page path, with exactly one trailing slash. */
export function pageUrl(path: string): string {
	const slug = portalSlug(path)
	return slug.length === 0 ? `${PORTAL_ORIGIN}/` : `${PORTAL_ORIGIN}/${slug}/`
}
