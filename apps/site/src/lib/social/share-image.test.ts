import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { SITE_BRAND_NAME } from "../site"
import { LOCKUP_HEIGHT, SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "./layout"
import type { ShareLockup } from "./lockup"
import { absoluteShareImageUrl, shareImageAlt, shareImagePath } from "./share-advert"
import type { ShareColours } from "./share-colours"
import { type ShareImage, type ShareImageInput, shareImage } from "./share-image"

const COLOURS: ShareColours = Object.freeze({
	background: "#0a0a0a",
	foreground: "#fafafa",
	mutedForeground: "#a1a1a1",
	accent: "#ea580c",
})

const LOCKUP: ShareLockup = Object.freeze({
	width: 676,
	height: 166,
	markup: '<path fill="currentColor" d="M0 0Z"/>',
})

/** One Language's image, composed from the Theme's colours and the shipped lockup. */
function imageOf(language: string): ShareImage {
	const input: ShareImageInput = {
		language,
		dictionary: dictionaryFor(language),
		colours: COLOURS,
		lockup: LOCKUP,
	}
	return shareImage(input)
}

describe("one Language's share image", () => {
	it("is written to that Language's own file", () => {
		expect(shareImagePath("en")).toBe("og/en.png")
		expect(shareImagePath("th")).toBe("og/th.png")
	})

	it("is advertised on the Site's own origin, in the form a crawler fetches", () => {
		expect(absoluteShareImageUrl("th")).toBe("https://trajectonomics.com/og/th.png")
	})

	it("is cut at the size every share sheet reads a large card at", () => {
		const image = imageOf("en")
		expect(image.width).toBe(SHARE_IMAGE_WIDTH)
		expect(image.height).toBe(SHARE_IMAGE_HEIGHT)
		expect(image.svg).toContain(`viewBox="0 0 ${SHARE_IMAGE_WIDTH} ${SHARE_IMAGE_HEIGHT}"`)
	})

	it("paints the Theme's own background, ink, muted meta and accent, and no other colour", () => {
		const { svg } = imageOf("en")
		const painted = svg.match(/#[0-9a-f]{6}/gi)
		expect(new Set(painted)).toEqual(new Set(Object.values(COLOURS)))
	})

	it("carries the Language's own value statement, each line in the face its script asks for", () => {
		const english = imageOf("en").svg
		expect(english).toContain('font-family="Aleo"')
		const thai = imageOf("th").svg
		expect(thai).toContain("ไม่มีแดชบอร์ด")
		expect(thai).toContain('font-family="Noto Sans Thai"')
	})

	it("draws the brand lockup, scaled to the height the image allows", () => {
		const { svg } = imageOf("en")
		expect(svg).toContain(LOCKUP.markup)
		expect(svg).toContain(`scale(${Number((LOCKUP_HEIGHT / LOCKUP.height).toFixed(4))})`)
		expect(svg).toContain('color="#fafafa"')
	})

	it("names the host under the statement and the Language in the corner", () => {
		const english = imageOf("en").svg
		expect(english).toContain(">trajectonomics.com<")
		expect(english).toContain(`>${dictionaryFor("en").languageName}<`)
		expect(imageOf("th").svg).toContain(`>${dictionaryFor("th").languageName}<`)
	})

	it("reads the same lockup and the same size in both Languages, and different words", () => {
		const english = imageOf("en").svg
		const thai = imageOf("th").svg
		expect(english).not.toBe(thai)
		expect(english).toContain(LOCKUP.markup)
		expect(thai).toContain(LOCKUP.markup)
	})
})

describe("what the share image shows, for a reader who cannot see it", () => {
	it("names the wordmark and the Language's value statement", () => {
		const dictionary = dictionaryFor("en")
		expect(shareImageAlt(dictionary)).toBe(`${SITE_BRAND_NAME} — ${dictionary.description}`)
	})

	it("speaks each Language's own words", () => {
		expect(shareImageAlt(dictionaryFor("th"))).toContain(dictionaryFor("th").description)
		expect(shareImageAlt(dictionaryFor("th"))).not.toBe(shareImageAlt(dictionaryFor("en")))
	})
})
