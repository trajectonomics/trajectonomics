import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { DOCS_CLI_PATH, GITHUB_SKILLS_URL } from "../lib/site"
import TwoParts from "./TwoParts.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent } from "./testing/scan"

describe("the TwoParts section in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`carries the page's one section heading and no deeper heading (${language})`, async () => {
			const page = scanComponent(await renderComponent(TwoParts, { dictionary }))
			expect(headings(page).map((element) => element.tag)).toEqual(["h2"])
			const h2 = elementsByTag(page, "h2")[0]
			if (h2 === undefined) throw new Error("the section rendered no h2")
			expect(textOf(page, h2)).toBe(dictionary.twoPartHeading)
		})

		it(`names both parts and explains what one command installs (${language})`, async () => {
			const page = scanComponent(await renderComponent(TwoParts, { dictionary }))
			const text = page.text.map((run) => run.text).join(" ")
			for (const copy of [
				dictionary.skillsCardTitle,
				dictionary.skillsCardBody,
				dictionary.cliCardTitle,
				dictionary.cliCardBody,
				dictionary.twoPartFootnote,
			]) {
				expect(text).toContain(copy)
			}
		})

		it(`stars the onboarding skill and links the CLI docs (${language})`, async () => {
			const page = scanComponent(await renderComponent(TwoParts, { dictionary }))
			const links = elementsByTag(page, "a")
			const star = links.find((element) => element.attributes["href"] === GITHUB_SKILLS_URL)
			const docs = links.find((element) => element.attributes["href"] === DOCS_CLI_PATH)
			if (star === undefined || docs === undefined) throw new Error("a section link is missing")
			expect(textOf(page, star)).toBe(dictionary.starOnboarding)
			expect(textOf(page, docs)).toBe(dictionary.cliDocsLink)
		})
	}
})
