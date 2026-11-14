import { describe, expect, it } from "bun:test"
import { absoluteLocaleUrl } from "../language/languages"
import { checkAdvertisedLinks } from "./advertised-links"
import { codes, edited, entryAt } from "./testing/homes"

describe("the links a Language home advertises", () => {
	it("passes a home that advertises every Language at its absolute URL", () => {
		expect(codes(checkAdvertisedLinks)).toEqual([])
	})

	it("fails a home that advertises no link for another Language", () => {
		const other = entryAt(1)
		const pattern = new RegExp(`<link rel="alternate" hreflang="${other.language}"[^>]*>`)
		expect(codes(checkAdvertisedLinks, edited(entryAt(0).language, pattern, ""))).toEqual([
			"HREFLANG_MISSING",
		])
	})

	it("fails a home whose advertised link points somewhere else", () => {
		const other = entryAt(1)
		const pattern = new RegExp(`hreflang="${other.language}" href="[^"]*"`)
		expect(
			codes(
				checkAdvertisedLinks,
				edited(entryAt(0).language, pattern, `hreflang="${other.language}" href="/x/"`),
			),
		).toEqual(["HREFLANG_WRONG_URL"])
	})

	it("fails a home that carries no x-default link", () => {
		expect(
			codes(
				checkAdvertisedLinks,
				edited(entryAt(0).language, /<link rel="alternate" hreflang="x-default"[^>]*>/, ""),
			),
		).toEqual(["X_DEFAULT_MISSING"])
	})

	it("fails a home whose x-default does not point at the fallback Language", () => {
		const pattern = /hreflang="x-default" href="[^"]*"/
		expect(
			codes(
				checkAdvertisedLinks,
				edited(
					entryAt(0).language,
					pattern,
					`hreflang="x-default" href="${absoluteLocaleUrl(entryAt(0).language)}"`,
				),
			),
		).toEqual(["X_DEFAULT_WRONG_URL"])
	})
})
