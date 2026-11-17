import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { FI_DEMO_COMMAND, FI_DEMO_DATE } from "../lib/site"
import SeeItInAction from "./SeeItInAction.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

describe("the See it in action section in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`carries one h2 and no deeper heading (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			expect(headings(page).map((element) => element.tag)).toEqual(["h2"])
			const h2 = elementsByTag(page, "h2")[0]
			if (h2 === undefined) throw new Error("the section rendered no h2")
			expect(textOf(page, h2)).toBe(dictionary.actionHeading)
		})

		it(`puts the same question to both panels (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const panels = withClass(page, "compare-panel")
			expect(panels.map((panel) => panel.attributes["data-side"])).toEqual(["without", "with"])
			for (const panel of panels) {
				const asked = withClass(page, "compare-question").filter((element) =>
					element.ancestors.includes(panel),
				)
				expect(asked.map((element) => textOf(page, element))).toEqual([
					`${dictionary.actionYou} ${dictionary.actionQuestion}`,
				])
			}
		})

		it(`gives the agent alone three different guesses (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const guesses = withClass(page, "bubble-guess").map((element) => textOf(page, element))
			expect(guesses).toEqual(
				dictionary.actionGuesses.map((guess) => `${dictionary.actionAgent} ${guess}`),
			)
		})

		it(`gives the agent with traj the same answer on every run (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const answers = withClass(page, "bubble-answer").map((element) => textOf(page, element))
			expect(answers).toEqual(
				dictionary.actionRunLabels.map(
					() => `${dictionary.actionAgent} ${dictionary.actionAnswer}`,
				),
			)
		})

		it(`shows the CLI command and the JSON it prints, as an abridged example (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const text = page.text.map((run) => run.text).join(" ")
			expect(text).toContain(FI_DEMO_COMMAND)
			expect(text).toContain(FI_DEMO_DATE)
			expect(text).toContain(dictionary.actionExampleNote)
			expect(withAttribute(page, "data-side", "with")).toHaveLength(1)
		})
	}
})
