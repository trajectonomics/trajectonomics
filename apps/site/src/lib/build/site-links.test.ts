import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { GITHUB_ORG_URL, GITHUB_SKILLS_URL, SKILLS_LICENCE_URL } from "../site"
import { checkSiteLinks } from "./site-links"
import { heroCodes, heroHome } from "./testing/hero"

const DICTIONARY = dictionaryFor("en")

describe("the named links of the footer", () => {
	it("passes every Language home, whose named links go where they say", () => {
		expect(heroCodes(checkSiteLinks)).toEqual([])
	})

	it("fails a skills link that goes to the organisation instead of the skills repository", () => {
		const page = heroHome("en")
		const content = page.content.replace(
			`<a href="${GITHUB_SKILLS_URL}">${DICTIONARY.footerSkillsRepo}</a>`,
			`<a href="${GITHUB_ORG_URL}">${DICTIONARY.footerSkillsRepo}</a>`,
		)
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual(["LINK_HREF_MISMATCH"])
	})

	it("fails a licence link that does not open the skills repository's LICENSE", () => {
		const page = heroHome("en")
		const content = page.content.replace(
			`href="${SKILLS_LICENCE_URL}"`,
			`href="${GITHUB_SKILLS_URL}"`,
		)
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual(["LINK_HREF_MISMATCH"])
	})

	it("fails a brand lockup that links a Language build path instead of the address", () => {
		const page = heroHome("en")
		const content = page.content.replace(
			'href="/" aria-label="trajectonomics"',
			'href="/th/" aria-label="trajectonomics"',
		)
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual([
			"WORDMARK_HREF_MISMATCH",
		])
	})

	it("fails a page with no brand link at all", () => {
		const page = heroHome("en")
		const content = page.content.replace(' aria-label="trajectonomics"', "")
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual(["WORDMARK_MISSING"])
	})
})
