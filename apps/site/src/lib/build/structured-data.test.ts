import { describe, expect, it } from "bun:test"
import { absoluteLocaleUrl } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { checkStructuredData } from "./structured-data"
import { codes, edited, entryAt } from "./testing/homes"

const HOME = entryAt(0).language
const OTHER = entryAt(1).language

/** The pattern of the page's one block, so a test can replace its text or drop it. */
const BLOCK = /<script type="application\/ld\+json">[\s\S]*?<\/script>/

/** The distinct codes a build reports, so a test names the condition and not how many paths broke it. */
function conditions(files: readonly BuiltFile[]): readonly string[] {
	return [...new Set(checkStructuredData(files).map((failure) => failure.code))]
}

/** A block naming the WebSite at `url`, as a page that got it wrong writes it. */
function blockAt(url: string): string {
	return `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"${url}#website","url":"${url}","name":"trajectonomics","description":"a page","inLanguage":"en","publisher":{"@id":"https://trajectonomics.com/#organization"}},{"@type":"Organization","@id":"https://trajectonomics.com/#organization","name":"trajectonomics","url":"https://trajectonomics.com"}]}</script>`
}

describe("the Structured data of a Language home", () => {
	it("passes a home whose one block names the WebSite and its publisher", () => {
		expect(codes(checkStructuredData)).toEqual([])
	})

	it("fails a home that carries no block at all", () => {
		expect(codes(checkStructuredData, edited(HOME, BLOCK, ""))).toEqual(["JSON_LD_MISSING"])
	})

	it("fails a home that carries a second block", () => {
		const extra = '<script type="application/ld+json">{"@context":"https://schema.org"}</script>'
		expect(codes(checkStructuredData, edited(HOME, /<head>/, `<head>${extra}`))).toEqual([
			"JSON_LD_DUPLICATE",
		])
	})

	it("fails a block that is not JSON, so no parser reads it", () => {
		const broken = '<script type="application/ld+json">{ "@context": }</script>'
		expect(codes(checkStructuredData, edited(HOME, BLOCK, broken))).toEqual(["JSON_LD_INVALID"])
	})

	it("fails a home whose block points at the other Language's URL", () => {
		expect(conditions([edited(HOME, BLOCK, blockAt(absoluteLocaleUrl(OTHER)))])).toEqual([
			"JSON_LD_WRONG",
		])
	})

	it("fails a block that names no publisher, so nothing attributes the page", () => {
		const noPublisher = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","url":"${absoluteLocaleUrl(HOME)}"}]}</script>`
		expect(conditions([edited(HOME, BLOCK, noPublisher)])).toEqual(["JSON_LD_WRONG"])
	})

	it("fails a block that claims a property the page must not state, such as a logo", () => {
		const withLogo = blockAt(absoluteLocaleUrl(HOME)).replace(
			'"name":"trajectonomics","url"',
			'"name":"trajectonomics","logo":"https://trajectonomics.com/logo.png","url"',
		)
		expect(conditions([edited(HOME, BLOCK, withLogo)])).toEqual(["JSON_LD_WRONG"])
	})

	it("names the property that differs, what the build wrote and what the page must state", () => {
		const [failure] = checkStructuredData([edited(HOME, BLOCK, blockAt(absoluteLocaleUrl(OTHER)))])
		expect(failure?.message).toContain("@graph.0.")
		expect(failure?.message).toContain(absoluteLocaleUrl(OTHER))
		expect(failure?.message).toContain(absoluteLocaleUrl(HOME))
		expect(failure?.path).toBe(`/${HOME}/`)
	})
})
