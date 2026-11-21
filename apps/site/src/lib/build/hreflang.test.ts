import { describe, expect, it } from "bun:test"
import { ABSOLUTE_CLEAN_URL } from "../language/languages"
import { SITE_ORIGIN } from "../site"
import { checkHreflang } from "./hreflang"
import { codes, edited, entryAt, homes } from "./testing/homes"

const HOME = entryAt(0).language
const OTHER = entryAt(1).language

/** The one alternate a home carries, so a test can point it somewhere else. */
const DEFAULT = /<link rel="alternate" hreflang="x-default"[^>]*>/

describe("the alternate of a Language home", () => {
	it("passes homes that name one x-default at the Site's address", () => {
		expect(codes(checkHreflang)).toEqual([])
	})

	it("fails a home that advertises no alternate at all", () => {
		expect(codes(checkHreflang, edited(HOME, DEFAULT, ""))).toEqual(["HREFLANG_MISSING"])
	})

	it("fails a home that advertises x-default twice", () => {
		const extra = `<link rel="alternate" hreflang="x-default" href="${ABSOLUTE_CLEAN_URL}">`
		expect(codes(checkHreflang, edited(HOME, /<head>/, `<head>${extra}`))).toEqual([
			"HREFLANG_DUPLICATE",
		])
	})

	it("fails an alternate that names a path no page answers at", () => {
		expect(
			codes(
				checkHreflang,
				edited(HOME, DEFAULT, '<link rel="alternate" hreflang="x-default" href="/th/">'),
			),
		).toEqual(["HREFLANG_TARGET"])
	})

	it("fails an alternate on another origin, which names another site", () => {
		expect(
			codes(
				checkHreflang,
				edited(
					HOME,
					DEFAULT,
					'<link rel="alternate" hreflang="x-default" href="https://example.com/">',
				),
			),
		).toEqual(["HREFLANG_TARGET"])
	})

	it("fails an alternate that is relative rather than path-absolute or absolute", () => {
		expect(
			codes(
				checkHreflang,
				edited(HOME, DEFAULT, '<link rel="alternate" hreflang="x-default" href="">'),
			),
		).toEqual(["HREFLANG_TARGET"])
	})

	it("passes a path-absolute alternate, which needs no origin", () => {
		const pathAbsolute = homes().map((file) => ({
			path: file.path,
			content: file.content.replaceAll(ABSOLUTE_CLEAN_URL, "/"),
		}))
		expect(checkHreflang(pathAbsolute).map((failure) => failure.code)).toEqual([])
	})

	it("fails a home that advertises a per-Language alternate, because no second URL exists", () => {
		const extra = `<link rel="alternate" hreflang="${OTHER}" href="${SITE_ORIGIN}/${OTHER}/">`
		expect(codes(checkHreflang, edited(HOME, /<head>/, `<head>${extra}`))).toEqual([
			"HREFLANG_LANGUAGE_ALTERNATE",
		])
	})
})
