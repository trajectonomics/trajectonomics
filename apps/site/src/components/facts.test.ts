import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import Facts from "./Facts.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute } from "./testing/scan"

describe("the three facts, in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`states every fact's label over its text, in order (${language})`, async () => {
			const page = scanComponent(await renderComponent(Facts, { dictionary }))
			const facts = withAttribute(page, "data-fact").map((fact) => textOf(page, fact))
			expect(facts).toEqual(
				dictionary.factLabels.map(
					(label, index) => `${label} ${dictionary.factTexts[index] ?? ""}`,
				),
			)
		})

		it(`states three facts and no heading, so it competes with no section (${language})`, async () => {
			const page = scanComponent(await renderComponent(Facts, { dictionary }))
			expect(withAttribute(page, "data-fact").length).toBe(3)
			expect(headings(page)).toEqual([])
		})

		it(`pairs each label with its text as a definition, so a reader hears which is which (${language})`, async () => {
			const page = scanComponent(await renderComponent(Facts, { dictionary }))
			expect(elementsByTag(page, "dl").length).toBe(1)
			expect(elementsByTag(page, "dt").map((term) => textOf(page, term))).toEqual([
				...dictionary.factLabels,
			])
			expect(elementsByTag(page, "dd").map((definition) => textOf(page, definition))).toEqual([
				...dictionary.factTexts,
			])
		})
	}
})
