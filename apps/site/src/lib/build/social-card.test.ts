import { describe, expect, it } from "bun:test"
import { ABSOLUTE_CLEAN_URL, languageEntry } from "../language/languages"
import { absoluteShareImageUrl } from "../social/share-advert"
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

	it("fails a home whose card points somewhere other than the Site's address", () => {
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					propertyPattern("og:url"),
					'<meta property="og:url" content="https://trajectonomics.com/th/">',
				),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("fails a home whose card states the other Language's locale", () => {
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					propertyPattern("og:locale"),
					`<meta property="og:locale" content="${languageEntry(OTHER).locale}">`,
				),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("fails a home whose card names no alternate Language", () => {
		expect(
			codes(checkSocialCard, edited(HOME, propertyPattern("og:locale:alternate"), "")),
		).toEqual(["SOCIAL_CARD_MISSING"])
	})

	it("fails a home whose card calls the page an article", () => {
		expect(
			codes(
				checkSocialCard,
				edited(HOME, propertyPattern("og:type"), '<meta property="og:type" content="article">'),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("fails a card that promises a small image the page does not draw", () => {
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					/<meta name="twitter:card"[^>]*>/,
					'<meta name="twitter:card" content="summary">',
				),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("fails a home whose card names no share image", () => {
		expect(codes(checkSocialCard, edited(HOME, propertyPattern("og:image"), ""))).toEqual([
			"SOCIAL_CARD_MISSING",
		])
	})

	it("fails a home whose card points at the other Language's image", () => {
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					propertyPattern("og:image"),
					`<meta property="og:image" content="${absoluteShareImageUrl(OTHER)}">`,
				),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("passes the card's own width and fails any other the image is not drawn at", () => {
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					propertyPattern("og:image:width"),
					'<meta property="og:image:width" content="1200">',
				),
			),
		).toEqual([])
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					propertyPattern("og:image:width"),
					'<meta property="og:image:width" content="600">',
				),
			),
		).toEqual(["SOCIAL_CARD_WRONG"])
	})

	it("fails a card that describes the image in the other Language's words", () => {
		expect(
			codes(
				checkSocialCard,
				edited(
					HOME,
					propertyPattern("og:image:alt"),
					`<meta property="og:image:alt" content="traj — a share image">`,
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
				'<meta property="og:url" content="https://example.com/">',
			),
		])
		expect(failure?.message).toContain("og:url")
		expect(failure?.message).toContain("https://example.com/")
		expect(failure?.message).toContain(ABSOLUTE_CLEAN_URL)
		expect(failure?.path).toBe(`/${HOME}/`)
	})
})
