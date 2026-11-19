import { describe, expect, it } from "bun:test"
import { textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { FI_DEMO_COMMAND, FI_DEMO_DATE } from "../lib/site"
import SeeItInAction from "./SeeItInAction.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

describe("the See it in action section in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`carries no heading: the hero's one h1 is the page's claim (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			expect(headings(page)).toEqual([])
			expect(withClass(page, "section-head")).toEqual([])
		})

		it(`labels the panels before and after, and lands on before (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			expect(withClass(page, "compare-tab-label").map((element) => textOf(page, element))).toEqual([
				dictionary.actionBeforeLabel,
				dictionary.actionAfterLabel,
			])
			const wrap = withAttribute(page, "data-action-compare")[0]
			expect(wrap?.attributes["data-action-stage"]).toBe("without")
			expect(
				withClass(page, "compare-tab-button").map((element) => element.attributes["aria-pressed"]),
			).toEqual(["true", "false"])
		})

		it(`gives a phone one tab per panel, with the animation's two hooks (${language})`, async () => {
			const html = await renderComponent(SeeItInAction, { dictionary })
			const page = scanComponent(html)
			expect(withClass(page, "compare-tabs")).toHaveLength(1)
			expect(withClass(page, "compare-tab-button")).toHaveLength(2)
			expect(html).toContain("traj:action-animation-start")
			expect(html).toContain("traj:action-animation-finished")
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
