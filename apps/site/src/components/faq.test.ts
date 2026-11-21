import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import Faq from "./Faq.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withClass } from "./testing/scan"

describe("the FAQ section in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`carries one h2 and no deeper heading, so a question is plain text (${language})`, async () => {
			const page = scanComponent(await renderComponent(Faq, { dictionary }))
			expect(headings(page).map((element) => element.tag)).toEqual(["h2"])
			const h2 = elementsByTag(page, "h2")[0]
			if (h2 === undefined) throw new Error("the section rendered no h2")
			expect(textOf(page, h2)).toBe(dictionary.faqHeading)
		})

		it(`has one answer per question (${language})`, () => {
			expect(dictionary.faqQuestions.length).toBeGreaterThan(0)
			expect(dictionary.faqAnswers.length).toBe(dictionary.faqQuestions.length)
		})

		it(`shows every question as a native disclosure, with its answer in the page (${language})`, async () => {
			const page = scanComponent(await renderComponent(Faq, { dictionary }))
			expect(elementsByTag(page, "details")).toHaveLength(dictionary.faqQuestions.length)
			const questions = withClass(page, "faq-question").map((element) =>
				textOf(page, element).trim(),
			)
			const answers = withClass(page, "faq-answer").map((element) => textOf(page, element))
			expect(questions).toEqual([...dictionary.faqQuestions])
			expect(answers).toEqual([...dictionary.faqAnswers])
		})

		it(`paints the answers in foreground, which keeps 4.5:1 on the muted surface (${language})`, async () => {
			const page = scanComponent(await renderComponent(Faq, { dictionary }))
			for (const answer of withClass(page, "faq-answer")) {
				expect(answer.attributes["class"]).toContain("text-foreground")
			}
		})
	}
})
