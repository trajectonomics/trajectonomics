import { describe, expect, it } from "bun:test"
import { elementsByTag, relTokens, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry, localeUrl } from "../lib/language/languages"
import NotFound from "./NotFound.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

describe("the NotFound component in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`is a full document in the Language, unindexed (${language})`, async () => {
			const page = scanComponent(await renderComponent(NotFound, { language }))
			const html = elementsByTag(page, "html")[0]
			if (html === undefined) throw new Error("no document rendered")
			expect(html.attributes["lang"]).toBe(language)
			const robots = elementsByTag(page, "meta").find(
				(element) => element.attributes["name"] === "robots",
			)
			expect(robots?.attributes["content"]).toBe("noindex")
			const canonical = elementsByTag(page, "link").filter((element) =>
				relTokens(element).includes("canonical"),
			)
			expect(canonical).toEqual([])
		})

		it(`makes its one claim in the h1 and links home (${language})`, async () => {
			const page = scanComponent(await renderComponent(NotFound, { language }))
			expect(headings(page).map((element) => element.tag)).toEqual(["h1"])
			const h1 = elementsByTag(page, "h1")[0]
			if (h1 === undefined) throw new Error("no h1 rendered")
			expect(textOf(page, h1)).toBe(dictionary.notFoundHeading)
			const body = page.text.map((run) => run.text).join(" ")
			expect(body).toContain(dictionary.notFoundBody)
			const home = elementsByTag(page, "a").find(
				(element) => element.attributes["href"] === localeUrl(language),
			)
			expect(home).toBeDefined()
		})

		it(`wraps the message in the header and footer, with no current page (${language})`, async () => {
			const page = scanComponent(await renderComponent(NotFound, { language }))
			expect(withClass(page, "site-header").length).toBe(1)
			expect(elementsByTag(page, "footer").length).toBe(1)
			expect(elementsByTag(page, "main").length).toBe(1)
			expect(withAttribute(page, "aria-current")).toEqual([])
		})
	}
})
