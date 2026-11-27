import { describe, expect, it } from "bun:test"
import { textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { BLOG_PATH, DATA_PATH, DOCS_PATH, OPENJOT_PATH } from "../lib/site"
import Header from "./Header.astro"
import { renderComponent } from "./testing/render"
import { scanComponent, withAttribute, withClass } from "./testing/scan"

/** The nav's OpenJot link, as the header renders it. */
async function linkOn(language: string, openjotCurrent: boolean) {
	const page = scanComponent(
		await renderComponent(Header, {
			language,
			dictionary: languageEntry(language).dictionary,
			markCurrent: true,
			address: "/",
			openjotCurrent,
		}),
	)
	const link = withClass(page, "header-nav-link").find(
		(element) => element.attributes["href"] === OPENJOT_PATH,
	)
	if (link === undefined) throw new Error("the OpenJot link is missing")
	return { page, link }
}

describe("the header's OpenJot link", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`links OpenJot by its name, and marks it only on its own page (${language})`, async () => {
			const off = await linkOn(language, false)
			expect(textOf(off.page, off.link)).toBe(dictionary.openjotLink)
			expect(off.link.attributes["aria-current"]).toBeUndefined()
			const on = await linkOn(language, true)
			expect(on.link.attributes["aria-current"]).toBe("page")
		})

		it(`puts the nav links in the order OpenJot, Data, Blog, Docs (${language})`, async () => {
			const { page } = await linkOn(language, false)
			const hrefs = withClass(page, "header-nav-link").map((element) => element.attributes["href"])
			expect(hrefs).toEqual([OPENJOT_PATH, DATA_PATH, BLOG_PATH, DOCS_PATH])
		})

		it(`marks one current link off OpenJot, and two on it (${language})`, async () => {
			const off = await linkOn(language, false)
			expect(withAttribute(off.page, "aria-current")).toHaveLength(1)
			const on = await linkOn(language, true)
			expect(withAttribute(on.page, "aria-current")).toHaveLength(2)
		})
	}
})
