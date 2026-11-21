import { SITE_ORIGIN } from "../site"
import { isAbsoluteUrl } from "./absolute-url"

/** Where an `hreflang` href points: its path, and the origin when the href is absolute. */
export interface HreflangTarget {
	/** The URL path, such as `/`, which is what the alternate promises. */
	readonly path: string
	/** The origin of an absolute href, or `undefined` for a path-absolute one. */
	readonly origin: string | undefined
}

/**
 * The target an alternate's `href` names, or `undefined` when it is neither path-absolute nor
 * absolute, because a relative href does not name the Site's address.
 */
export function hreflangTarget(href: string | undefined): HreflangTarget | undefined {
	if (href === undefined) return undefined
	const value = href.trim()
	const absolute = isAbsoluteUrl(value)
	if (!absolute && !(value.startsWith("/") && !value.startsWith("//"))) return undefined
	let url: URL
	try {
		url = new URL(value, SITE_ORIGIN)
	} catch {
		return undefined
	}
	return Object.freeze({ path: url.pathname, origin: absolute ? url.origin : undefined })
}
