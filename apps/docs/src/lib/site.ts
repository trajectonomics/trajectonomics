/** The origin the Docs Portal is built for. */
export const SITE_ORIGIN = "https://docs.trajectonomics.com"

/** The Site's origin. The header's way back leaves this host for that one. */
export const APEX_ORIGIN = "https://trajectonomics.com"

/** The absolute URL of a Docs Portal page path, with exactly one trailing slash. */
export function pageUrl(path: string): string {
	const slug = path.replace(/^\/+|\/+$/g, "")
	return slug.length === 0 ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}/${slug}/`
}
