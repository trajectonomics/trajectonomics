import { describe, expect, it } from "bun:test"
import type { Language } from "../language/language"
import { absoluteLocaleUrl, localeUrl } from "../language/languages"
import { SITE_ORIGIN } from "../site"
import { checkHreflang } from "./hreflang"
import { codes, edited, entryAt, homes } from "./testing/homes"

const HOME = entryAt(0).language
const OTHER = entryAt(1).language

/** The href pattern of one Language's alternate, so a test can point it somewhere else. */
function alternatePattern(language: Language): RegExp {
	return new RegExp(`hreflang="${language}" href="[^"]*"`)
}

describe("the hreflang pair of a Language home", () => {
	it("passes homes whose alternates point at each other from one origin", () => {
		expect(codes(checkHreflang)).toEqual([])
	})

	it("fails a home that advertises no alternate for another Language", () => {
		const pattern = new RegExp(`<link rel="alternate" hreflang="${OTHER}"[^>]*>`)
		expect(codes(checkHreflang, edited(HOME, pattern, ""))).toEqual(["HREFLANG_MISSING"])
	})

	it("fails a home that advertises one Language twice", () => {
		const extra = `<link rel="alternate" hreflang="${OTHER}" href="${absoluteLocaleUrl(OTHER)}">`
		expect(codes(checkHreflang, edited(HOME, /<head>/, `<head>${extra}`))).toEqual([
			"HREFLANG_DUPLICATE",
		])
	})

	it("fails an alternate whose path is not that Language's Locale URL", () => {
		expect(
			codes(
				checkHreflang,
				edited(HOME, alternatePattern(OTHER), `hreflang="${OTHER}" href="/de/"`),
			),
		).toEqual(["HREFLANG_TARGET"])
	})

	it("fails an alternate that is relative rather than path-absolute or absolute", () => {
		expect(
			codes(
				checkHreflang,
				edited(HOME, alternatePattern(OTHER), `hreflang="${OTHER}" href="${OTHER}/"`),
			),
		).toEqual(["HREFLANG_TARGET"])
	})

	it("passes path-absolute alternates, which need no origin", () => {
		const pathAbsolute = homes().map((file) => ({
			path: file.path,
			content: file.content.replaceAll(`${SITE_ORIGIN}/`, "/"),
		}))
		expect(checkHreflang(pathAbsolute).map((failure) => failure.code)).toEqual([])
	})

	it("fails absolute alternates that do not share one origin, on both pages", () => {
		expect(
			codes(
				checkHreflang,
				edited(
					HOME,
					alternatePattern(OTHER),
					`hreflang="${OTHER}" href="https://example.com${localeUrl(OTHER)}"`,
				),
			),
		).toEqual(["HREFLANG_TARGET", "HREFLANG_TARGET"])
	})

	it("passes a build that omits x-default, which is not required", () => {
		const withoutDefault = homes().map((file) => ({
			path: file.path,
			content: file.content.replace(/<link rel="alternate" hreflang="x-default"[^>]*>/, ""),
		}))
		expect(checkHreflang(withoutDefault).map((failure) => failure.code)).toEqual([])
	})
})
