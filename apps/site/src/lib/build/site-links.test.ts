import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { CLI_LICENCE_URL, GITHUB_CLI_URL, GITHUB_ORG_URL } from "../site"
import { checkSiteLinks } from "./site-links"
import { heroCodes, heroHome } from "./testing/hero"

const DICTIONARY = dictionaryFor("en")

describe("the links of the three regions", () => {
	it("passes every Language home, whose named links go where they say", () => {
		expect(heroCodes(checkSiteLinks)).toEqual([])
	})

	it("fails a Docs link that does not go to /docs/", () => {
		const page = heroHome("en")
		const content = page.content.replace('href="/docs/"', 'href="/documentation/"')
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual(["LINK_HREF_MISMATCH"])
	})

	it("fails a page with no GitHub link", () => {
		const page = heroHome("en")
		const content = page.content.replace(
			`<a href="${GITHUB_CLI_URL}">${DICTIONARY.githubLink}</a>`,
			"",
		)
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual(["LINK_MISSING"])
	})

	it("fails a star link that goes to the organisation instead of the cli repository", () => {
		const page = heroHome("en")
		const content = page.content.replace(
			`<a href="${GITHUB_CLI_URL}">${DICTIONARY.starOnGitHub}</a>`,
			`<a href="${GITHUB_ORG_URL}">${DICTIONARY.starOnGitHub}</a>`,
		)
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual(["LINK_HREF_MISMATCH"])
	})

	it("fails a licence link that does not open the cli repository's LICENSE", () => {
		const page = heroHome("en")
		const content = page.content.replace(`href="${CLI_LICENCE_URL}"`, `href="${GITHUB_CLI_URL}"`)
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual(["LINK_HREF_MISMATCH"])
	})

	it("fails a wordmark that links the other Language's home", () => {
		const page = heroHome("en")
		const content = page.content.replace(
			'href="/en/" aria-label="trajectonomics"',
			'href="/th/" aria-label="trajectonomics"',
		)
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual([
			"WORDMARK_HREF_MISMATCH",
		])
	})

	it("fails a page with no wordmark link at all", () => {
		const page = heroHome("en")
		const content = page.content.replace(' aria-label="trajectonomics"', "")
		expect(heroCodes(checkSiteLinks, { path: page.path, content })).toEqual(["WORDMARK_MISSING"])
	})
})
