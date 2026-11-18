import { describe, expect, it } from "bun:test"
import { absoluteLocaleUrl } from "../language/languages"
import { structuredData, structuredDataJson } from "../site/structured-data"
import type { BuiltFile } from "./built-files"
import { checkStructuredData } from "./structured-data"
import { checkStructuredDataClaims } from "./structured-data-claims"
import { codes, edited, entryAt, homes } from "./testing/homes"

const HOME = entryAt(0).language
const OTHER = entryAt(1).language

/** The pattern of the page's one block, so a test can replace its text or drop it. */
const BLOCK = /<script type="application\/ld\+json">[\s\S]*?<\/script>/

/** The distinct codes a build reports, so a test names the condition and not how many paths broke it. */
function conditions(files: readonly BuiltFile[]): readonly string[] {
	return [...new Set(checkStructuredData(files).map((failure) => failure.code))]
}

/** The claim codes a build reports, distinct, as the claims rule reports them. */
function claimConditions(files: readonly BuiltFile[]): readonly string[] {
	return [...new Set(checkStructuredDataClaims(files).map((failure) => failure.code))]
}

/** The block of one Language's home as a page writes it. */
function blockOf(language: string): string {
	return `<script type="application/ld+json">${structuredDataJson(language)}</script>`
}

describe("the Structured data of a Language home", () => {
	it("passes a home whose one block names the WebSite, its publisher and traj", () => {
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
		expect(conditions([edited(HOME, BLOCK, blockOf(OTHER))])).toEqual(["JSON_LD_WRONG"])
	})

	it("fails a block that names no publisher, so nothing attributes the page", () => {
		const noPublisher = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","url":"${absoluteLocaleUrl(HOME)}"}]}</script>`
		expect(conditions([edited(HOME, BLOCK, noPublisher)])).toEqual(["JSON_LD_WRONG"])
	})

	it("fails a block that leaves traj out, so a crawler cannot name the program", () => {
		const block = structuredData(HOME)
		const [website, organization] = block["@graph"]
		const withoutTraj = `<script type="application/ld+json">${JSON.stringify({
			"@context": block["@context"],
			"@graph": [website, organization],
		})}</script>`
		expect(conditions([edited(HOME, BLOCK, withoutTraj)])).toEqual(["JSON_LD_WRONG"])
	})

	it("names the property that differs, what the build wrote and what the page must state", () => {
		const [failure] = checkStructuredData([edited(HOME, BLOCK, blockOf(OTHER))])
		expect(failure?.message).toContain("@graph.0.")
		expect(failure?.message).toContain(absoluteLocaleUrl(OTHER))
		expect(failure?.message).toContain(absoluteLocaleUrl(HOME))
		expect(failure?.path).toBe(`/${HOME}/`)
	})
})

describe("the claims a home's Structured data may state", () => {
	it("passes a home whose block claims no rating and no review", () => {
		expect(claimConditions(homes())).toEqual([])
	})

	for (const claim of ["aggregateRating", "reviewRating"]) {
		it(`fails a block that claims a ${claim}, which no fact on the page supports`, () => {
			const claimed = blockOf(HOME).replace(
				'"@type":"SoftwareApplication"',
				`"${claim}":{"@type":"AggregateRating","ratingValue":"5","reviewCount":"1"},"@type":"SoftwareApplication"`,
			)
			expect(claimConditions([edited(HOME, BLOCK, claimed)])).toEqual(["JSON_LD_CLAIM_PRESENT"])
		})
	}

	it("fails a block that nests a review inside another node", () => {
		const claimed = blockOf(HOME).replace(
			'"sameAs"',
			'"review":{"@type":"Review","reviewBody":"great"},"sameAs"',
		)
		expect(claimConditions([edited(HOME, BLOCK, claimed)])).toEqual(["JSON_LD_CLAIM_PRESENT"])
	})
})
