import { SITE_ORIGIN } from "./site"

/**
 * The absolute canonical URL of a built page: the apex origin plus the page's public path, which
 * already includes the `/data` base and always ends in a slash because the build uses
 * `trailingSlash: "always"`.
 */
export function canonicalUrl(pathname: string): string {
	if (!pathname.startsWith("/")) {
		throw new Error(`canonicalUrl: "${pathname}" is not an absolute path`)
	}
	const path = pathname.endsWith("/") ? pathname : `${pathname}/`
	return new URL(path, SITE_ORIGIN).href
}
