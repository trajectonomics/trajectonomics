/**
 * The canonical link and the Open Graph and X card a page's head carries, as data. The layout renders
 * them, and the build check reads the built head against the same values, so the two cannot drift.
 */

import { PORTAL_NAME, PORTAL_PURPOSE } from "./portal"
import { pageUrl, SITE_ORIGIN } from "./site"

/** The Site's social image, shared with the Docs Portal so a share looks the same on both surfaces. */
export const SHARE_IMAGE_URL = `${SITE_ORIGIN}/og/en.png`

/** The share image's size and type, as the Site's own share image declares them. */
export const SHARE_IMAGE_WIDTH = 1200
export const SHARE_IMAGE_HEIGHT = 630
export const SHARE_IMAGE_TYPE = "image/png"

/** The `og:type` every page states: the Site's convention for its pages. */
export const OG_TYPE = "website"

/** The `twitter:card` every page states: the large image card the share image is made for. */
export const TWITTER_CARD = "summary_large_image"

/** What a page's share carries: its absolute URL, which is also its canonical, and its words. */
export interface PageShare {
	readonly url: string
	readonly title: string
	readonly description: string
	readonly image: string
}

/**
 * The share of one page: its absolute URL, its title, its description (the Portal's own sentence
 * when the page has none) and the Site's share image.
 */
export function pageShare(path: string, title: string, description: string | undefined): PageShare {
	return Object.freeze({
		url: pageUrl(path),
		title,
		description: description ?? PORTAL_PURPOSE,
		image: SHARE_IMAGE_URL,
	})
}

/** The name the Open Graph `og:site_name` states for every page of the Docs Portal. */
export const SITE_NAME = PORTAL_NAME
