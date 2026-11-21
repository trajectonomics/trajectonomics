import { SITE_ORIGIN } from "../site"
import { SITEMAP_URLS } from "./sitemap"

/** IndexNow's endpoint, where `bun run indexnow` posts the Site's URLs. */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow"

/**
 * The IndexNow key: 32 hex characters generated once for this Site. It names the Site to the
 * endpoint and is served from the Site's own root, so it is public by design — it is not a secret,
 * and it signs nothing.
 */
export const INDEXNOW_KEY = "4bc4ff77c0b12a6d0f261b2c61f7ac41"

/** The key's built path at the assets root: the key itself, and `.txt` after it. */
export const INDEXNOW_KEY_FILE = `${INDEXNOW_KEY}.txt`

/** That file on the Site's origin, where the endpoint checks the key belongs to the host. */
export const INDEXNOW_KEY_URL = `${SITE_ORIGIN}/${INDEXNOW_KEY_FILE}`

/** The body one IndexNow submission carries. */
export interface IndexNowPayload {
	readonly host: string
	readonly key: string
	readonly keyLocation: string
	readonly urlList: readonly string[]
}

/** The body `bun run indexnow` posts: the Site's host, the key, and every URL the Sitemap lists. */
export function indexNowPayload(): IndexNowPayload {
	return Object.freeze({
		host: new URL(SITE_ORIGIN).host,
		key: INDEXNOW_KEY,
		keyLocation: INDEXNOW_KEY_URL,
		urlList: SITEMAP_URLS,
	})
}
