import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { DOCS_PATH, GITHUB_SKILLS_URL } from "../site"
import { checkPageLinks } from "./page-links"
import { heroCodes, heroHome } from "./testing/hero"

describe("the links every Language document must have", () => {
	it("passes every home that links the Docs Portal and the skills repository", () => {
		expect(heroCodes(checkPageLinks)).toEqual([])
	})

	it("fails a home with no link to /docs/", () => {
		const page = heroHome("en")
		const content = page.content.replace(`href="${DOCS_PATH}"`, 'href="/documentation/"')
		expect(heroCodes(checkPageLinks, { path: page.path, content })).toEqual([
			"PAGE_DOCS_LINK_MISSING",
		])
	})

	it("fails a home with no link to the skills repository", () => {
		const page = heroHome("en")
		const content = page.content.replaceAll(
			`href="${GITHUB_SKILLS_URL}"`,
			'href="https://example.com/skills"',
		)
		expect(heroCodes(checkPageLinks, { path: page.path, content })).toEqual([
			"PAGE_SKILLS_LINK_MISSING",
		])
	})

	it("counts the href, not the visible text, because the Dictionary supplies the text", () => {
		const page = heroHome("en")
		const content = page.content.replace(`>${dictionaryFor("en").docsLink}<`, ">Handbook<")
		expect(heroCodes(checkPageLinks, { path: page.path, content })).toEqual([])
	})

	it("ignores a link a script only names", () => {
		const page = heroHome("en")
		const withoutDocs = page.content.replace(`href="${DOCS_PATH}"`, 'href="/documentation/"')
		const content = withoutDocs.replace(
			"</head>",
			`<script>const tpl = '<a href="${DOCS_PATH}">Docs</a>'</script></head>`,
		)
		expect(heroCodes(checkPageLinks, { path: page.path, content })).toEqual([
			"PAGE_DOCS_LINK_MISSING",
		])
	})

	it("asks only the Language documents, because a Not-found page is not a Language home", () => {
		const files = [{ path: "404.html", content: "<html><body><main></main></body></html>" }]
		expect(checkPageLinks(files).map((failure) => failure.code)).toEqual([])
	})
})
