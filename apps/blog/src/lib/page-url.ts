import { SITE_ORIGIN } from "./site"

/**
 * The absolute canonical URL of a built page: the site origin plus the page's path, which always
 * ends in a slash because the build uses `trailingSlash: "always"`.
 */
export function canonicalUrl(pathname: string): string {
	if (!pathname.startsWith("/")) {
		throw new Error(`canonicalUrl: "${pathname}" is not an absolute path`)
	}
	const path = pathname.endsWith("/") ? pathname : `${pathname}/`
	return new URL(path, SITE_ORIGIN).href
}

/** The absolute URL of a file the blog serves, such as a share image; a file keeps its own path. */
export function fileUrl(path: string): string {
	if (!path.startsWith("/")) {
		throw new Error(`fileUrl: "${path}" is not an absolute path`)
	}
	return new URL(path, SITE_ORIGIN).href
}
