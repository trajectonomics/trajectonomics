import { describe, expect, it } from "bun:test"
import { ABSOLUTE_CLEAN_URL } from "../language/languages"
import { SITE_ORIGIN } from "../site"
import {
	INDEXNOW_ENDPOINT,
	INDEXNOW_KEY,
	INDEXNOW_KEY_FILE,
	INDEXNOW_KEY_URL,
	indexNowPayload,
} from "./indexnow"
import { SITEMAP_URLS } from "./sitemap"

describe("the IndexNow key and the file it is served from", () => {
	it("is 32 lowercase hex characters, the shape IndexNow accepts", () => {
		expect(INDEXNOW_KEY).toMatch(/^[0-9a-f]{32}$/)
	})

	it("is served from the assets root as a file named after the key", () => {
		expect(INDEXNOW_KEY_FILE).toBe(`${INDEXNOW_KEY}.txt`)
		expect(INDEXNOW_KEY_URL).toBe(`${SITE_ORIGIN}/${INDEXNOW_KEY_FILE}`)
	})

	it("is public by design, so the endpoint can read the same file the key names", () => {
		expect(INDEXNOW_KEY_URL.startsWith("https://")).toBe(true)
	})
})

describe("the body an IndexNow submission carries", () => {
	it("names the host, the key and the URL of the key's own file", () => {
		const payload = indexNowPayload()
		expect(payload.host).toBe("trajectonomics.com")
		expect(payload.key).toBe(INDEXNOW_KEY)
		expect(payload.keyLocation).toBe(INDEXNOW_KEY_URL)
	})

	it("lists the Site's one address, as the Sitemap does", () => {
		const payload = indexNowPayload()
		expect(payload.urlList).toEqual(SITEMAP_URLS)
		expect(payload.urlList).toEqual([ABSOLUTE_CLEAN_URL])
	})

	it("hands the body out frozen, so a run cannot edit what it submits", () => {
		const payload = indexNowPayload()
		expect(Object.isFrozen(payload)).toBe(true)
		expect(Object.isFrozen(payload.urlList)).toBe(true)
	})

	it("posts to IndexNow's one endpoint over TLS", () => {
		expect(INDEXNOW_ENDPOINT).toBe("https://api.indexnow.org/IndexNow")
	})
})
