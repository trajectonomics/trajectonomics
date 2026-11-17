import { describe, expect, it } from "bun:test"
import { absoluteLocaleUrl } from "../language/languages"
import { checkSocialCard } from "./social-card"
import { codes, edited, entryAt } from "./testing/homes"

const HOME = entryAt(0).language
const OTHER = entryAt(1).language

/** The pattern of one card property, so a test can replace it or drop it. */
function propertyPattern(key: string): RegExp {
	return new RegExp(`<meta property="${key}"[^>]*>`)
}

describe("the Social card of a Language home", () => {
	it("passes a home whose card names its title, its description, its URL and its kind", () => {
		expect(codes(checkSocialCard)).toEqual([])
	})

	it("fails a home whose card carries no title", () => {
		expect(codes(checkSocialCard, edited(HOME, propertyPattern("og:title"), ""))).toEqual([
			"SOCIAL_CARD_MISSING",
		])
	})

	it("fails a home whose card names no card kind for X", () => {
		expect(codes(checkSocialCard, edited(HOME, /<meta name="twitter:card"[^>]*>/, ""))).toEqual([
			"SOCIAL_CARD_MISSING",
		])
	})

	it("fails a home whose card carries one property twice", () => {
		expect(
			codes(
				checkSocialCard,
				edited(HOME, /<head>/, '<head><meta property="og:type" content="website">'),
			),
		).toEqual(["SOCIAL_CARD_DUPLICATE"])
	})

	it("fails a home whose card points at the other Language's URL", () => {
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					propertyPattern("og:url"),
					`<meta property="og:url" content="${absoluteLocaleUrl(OTHER)}">`,
				),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("fails a home whose card calls the page an article", () => {
		expect(
			codes(
				checkSocialCard,
				edited(HOME, propertyPattern("og:type"), '<meta property="og:type" content="article">'),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("fails a card that promises a large image the page does not ship", () => {
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					/<meta name="twitter:card"[^>]*>/,
					'<meta name="twitter:card" content="summary_large_image">',
				),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("fails a home whose card names the other Language's title", () => {
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					propertyPattern("og:title"),
					`<meta property="og:title" content="${entryAt(1).dictionary.documentTitle}">`,
				),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("names the property, the value the build wrote and the value the page must carry", () => {
		const [failure] = checkSocialCard([
			edited(
				HOME,
				propertyPattern("og:url"),
				'<meta property="og:url" content="https://trajectonomics.com/">',
			),
		])
		expect(failure?.message).toContain("og:url")
		expect(failure?.message).toContain("https://trajectonomics.com/")
		expect(failure?.message).toContain(absoluteLocaleUrl(HOME))
		expect(failure?.path).toBe(`/${HOME}/`)
	})
})
