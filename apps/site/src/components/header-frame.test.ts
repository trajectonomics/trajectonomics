import { describe, expect, it } from "bun:test"
import type { HtmlElement } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { BLOG_PATH, DATA_PATH, DOCS_PATH, OPENJOT_PATH, SITE_NAME } from "../lib/site"
import Header from "./Header.astro"
import { renderComponent } from "./testing/render"
import { scanComponent, withAttribute, withClass } from "./testing/scan"

/** The one element carrying a class token, or an error naming the missing column. */
function column(page: ReturnType<typeof scanComponent>, token: string): HtmlElement {
	const [element] = withClass(page, token)
	if (element === undefined) throw new Error(`the header is missing ${token}`)
	return element
}

/** The header's links to the Site's four sections, as rendered. */
function sectionLinks(page: ReturnType<typeof scanComponent>): readonly HtmlElement[] {
	return withClass(page, "ds-nav-link").filter((element) =>
		[OPENJOT_PATH, DATA_PATH, BLOG_PATH, DOCS_PATH].includes(element.attributes["href"] ?? ""),
	)
}

describe("the Site's header on the shared three-column frame", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`puts the tile alone at the start and the four sections in the centre (${language})`, async () => {
			const page = scanComponent(
				await renderComponent(Header, {
					language,
					dictionary,
					markCurrent: true,
					address: "/",
					openjotCurrent: false,
				}),
			)
			const start = column(page, "ds-header-start")
			const centre = column(page, "ds-header-nav")
			const end = column(page, "ds-header-end")

			// The Site has no marker: its start column is the tile alone, named by its link.
			expect(withClass(page, "ds-marker")).toHaveLength(0)
			const brand = withAttribute(page, "href", "/")[0]
			expect(brand?.attributes["aria-label"]).toBe(SITE_NAME)
			expect(brand?.ancestors.includes(start)).toBe(true)

			const links = sectionLinks(page)
			expect(links.map((link) => link.attributes["href"])).toEqual([
				OPENJOT_PATH,
				DATA_PATH,
				BLOG_PATH,
				DOCS_PATH,
			])
			for (const link of links) {
				expect(link.ancestors.includes(centre), `${link.attributes["href"]} is in the centre`).toBe(
					true,
				)
			}

			// The repository link and the Language menu are the tools at the end.
			expect(withClass(page, "header-repo")[0]?.ancestors.includes(end)).toBe(true)
			expect(withAttribute(page, "data-header-menu")[0]?.ancestors.includes(end)).toBe(true)
		})
	}
})
