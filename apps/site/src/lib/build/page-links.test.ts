import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { DOCS_CLI_INSTALL_PATH, DOCS_PATH, GITHUB_SKILLS_URL } from "../site"
import type { BuiltFile } from "./built-files"
import { checkPageLinks } from "./page-links"
import { heroCodes, heroHome, heroHomes } from "./testing/hero"

/** The English home with its way out rewired to the Docs CLI page, so the row is gone. */
function homeWithoutWayOut(): BuiltFile {
	const page = heroHome("en")
	return {
		path: page.path,
		content: page.content.replace(`href="${DOCS_CLI_INSTALL_PATH}"`, `href="${DOCS_PATH}"`),
	}
}

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

	it("fails a home whose install window has no way out", () => {
		expect(heroCodes(checkPageLinks, homeWithoutWayOut())).toEqual([
			"PAGE_CLI_INSTALL_LINK_MISSING",
		])
	})

	it("fails it once, naming the page that carries no way out", () => {
		const failures = checkPageLinks(heroHomes(homeWithoutWayOut())).filter(
			(failure) => failure.code === "PAGE_CLI_INSTALL_LINK_MISSING",
		)
		expect(failures.map((failure) => failure.path)).toEqual(["/en/"])
	})

	it("leaves the Docs and skills targets alone when the way out is missing", () => {
		const codes = heroCodes(checkPageLinks, homeWithoutWayOut())
		expect(codes).not.toContain("PAGE_DOCS_LINK_MISSING")
		expect(codes).not.toContain("PAGE_SKILLS_LINK_MISSING")
	})

	it("counts the way out by its href, so its Dictionary text may change", () => {
		const page = heroHome("en")
		const content = page.content.replace(
			`>${dictionaryFor("en").cliInstallLink}<`,
			">Get traj another way<",
		)
		expect(heroCodes(checkPageLinks, { path: page.path, content })).toEqual([])
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
