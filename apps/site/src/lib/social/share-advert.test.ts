import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { FI_DEMO_DATE, SITE_BRAND_NAME } from "../site"
import { absoluteShareImageUrl, shareImageAlt, shareImagePath } from "./share-advert"
import { shortMonthYear } from "./share-date"

/** The FI date as one Language writes it. */
function dateOf(language: string): string {
	return shortMonthYear(FI_DEMO_DATE, dictionaryFor(language).shareMonths)
}

describe("the address a home's share image is published at", () => {
	it("is written to that Language's own file", () => {
		expect(shareImagePath("en")).toBe("og/en.png")
		expect(shareImagePath("th")).toBe("og/th.png")
	})

	it("is advertised on the Site's own origin, in the form a crawler fetches", () => {
		expect(absoluteShareImageUrl("th")).toBe("https://trajectonomics.com/og/th.png")
	})
})

describe("what the home card shows, for a reader who cannot see it", () => {
	it("names the question, the date on the curve and what the orange part means", () => {
		expect(shareImageAlt(dictionaryFor("en"))).toBe(
			`${SITE_BRAND_NAME} — When can I stop working? A net-worth line, grey while working, turns orange at Aug 2041: free to stop.`,
		)
	})

	it("speaks each Language's own words, and names the brand first", () => {
		const thai = shareImageAlt(dictionaryFor("th"))
		expect(thai.startsWith(`${SITE_BRAND_NAME} — `)).toBe(true)
		expect(thai).toContain(dictionaryFor("th").actionQuestion)
		expect(thai).toContain(dateOf("th"))
		expect(thai).toContain(dictionaryFor("th").shareFreeLabel)
		expect(thai).not.toBe(shareImageAlt(dictionaryFor("en")))
	})
})
