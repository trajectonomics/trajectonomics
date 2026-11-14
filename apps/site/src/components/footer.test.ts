import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { GITHUB_ORG_URL, SKILLS_LICENCE_URL } from "../lib/site"
import Footer from "./Footer.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent } from "./testing/scan"

describe("the Footer component in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`renders one footer with the disclaimer first (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			const footer = elementsByTag(page, "footer")[0]
			if (footer === undefined) throw new Error("no footer rendered")
			const disclaimer = page.elements.find(
				(element) =>
					element.tag === "p" &&
					element.ancestors.includes(footer) &&
					textOf(page, element) === dictionary.footerDisclaimer,
			)
			expect(disclaimer).toBeDefined()
		})

		it(`links the licence and the organisation (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			const links = elementsByTag(page, "a")
			const licence = links.find((element) => element.attributes["href"] === SKILLS_LICENCE_URL)
			const org = links.find((element) => element.attributes["href"] === GITHUB_ORG_URL)
			if (licence === undefined || org === undefined) throw new Error("a footer link is missing")
			expect(textOf(page, licence)).toBe(dictionary.licence)
			expect(textOf(page, org)).toBe(dictionary.org)
		})

		it(`renders no heading (${language})`, async () => {
			const page = scanComponent(await renderComponent(Footer, { dictionary }))
			expect(headings(page)).toEqual([])
		})
	}
})
