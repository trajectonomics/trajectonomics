import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import Features from "./Features.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withClass } from "./testing/scan"

describe("the Features section in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`carries one h2 and no deeper heading, so a feature title is plain text (${language})`, async () => {
			const page = scanComponent(await renderComponent(Features, { dictionary }))
			expect(headings(page).map((element) => element.tag)).toEqual(["h2"])
			const h2 = elementsByTag(page, "h2")[0]
			if (h2 === undefined) throw new Error("the section rendered no h2")
			expect(textOf(page, h2)).toBe(dictionary.featuresHeading)
		})

		it(`shows every feature's title and sentence in order (${language})`, async () => {
			const page = scanComponent(await renderComponent(Features, { dictionary }))
			const titles = withClass(page, "feature-title").map((element) => textOf(page, element))
			const copies = withClass(page, "feature-copy").map((element) => textOf(page, element))
			expect(titles).toEqual([...dictionary.featureTitles])
			expect(copies).toEqual([...dictionary.featureCopies])
		})

		it(`paints each cell on the page surface so its text has a published background (${language})`, async () => {
			const page = scanComponent(await renderComponent(Features, { dictionary }))
			for (const cell of withClass(page, "feature")) {
				expect(cell.attributes["class"]).toContain("bg-background")
			}
		})
	}
})
