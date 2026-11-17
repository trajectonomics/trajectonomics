import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { DOCS_CLI_PATH, GITHUB_SKILLS_URL } from "../lib/site"
import HowItWorks from "./HowItWorks.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withClass } from "./testing/scan"

describe("the How it works section in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`carries one h2 and no deeper heading (${language})`, async () => {
			const page = scanComponent(await renderComponent(HowItWorks, { dictionary }))
			expect(headings(page).map((element) => element.tag)).toEqual(["h2"])
			const h2 = elementsByTag(page, "h2")[0]
			if (h2 === undefined) throw new Error("the section rendered no h2")
			expect(textOf(page, h2)).toBe(dictionary.howHeading)
		})

		it(`lists the workflow as four ordered steps (${language})`, async () => {
			const page = scanComponent(await renderComponent(HowItWorks, { dictionary }))
			const steps = withClass(page, "how-step").map((element) => textOf(page, element))
			expect(steps).toEqual(
				dictionary.howSteps.map((step, index) => `${String(index + 1).padStart(2, "0")} ${step}`),
			)
		})

		it(`says the agent owns the presentation layer and traj owns the logic layer (${language})`, async () => {
			const page = scanComponent(await renderComponent(HowItWorks, { dictionary }))
			const [presentation] = withClass(page, "layer-presentation")
			const [logic] = withClass(page, "layer-logic")
			if (presentation === undefined || logic === undefined) throw new Error("a layer is missing")
			const within = (layer: typeof presentation) => textOf(page, layer)
			expect(within(presentation)).toContain(dictionary.howPresentationLabel)
			expect(within(presentation)).toContain(dictionary.howPresentationOwner)
			for (const item of dictionary.howPresentationItems)
				expect(within(presentation)).toContain(item)
			expect(within(logic)).toContain(dictionary.howLogicLabel)
			expect(within(logic)).toContain(dictionary.howLogicOwner)
			for (const item of dictionary.howLogicItems) expect(within(logic)).toContain(item)
		})

		it(`puts the skills between the two layers (${language})`, async () => {
			const page = scanComponent(await renderComponent(HowItWorks, { dictionary }))
			const order = page.elements
				.filter((element) =>
					["layer-presentation", "layers-join", "layer-logic"].some((token) =>
						(element.attributes["class"] ?? "").split(/\s+/).includes(token),
					),
				)
				.map((element) => (element.attributes["class"] ?? "").split(/\s+/)[0])
			expect(order).toEqual(["layer", "layers-join", "layer"])
			const join = withClass(page, "layers-join")[0]
			if (join === undefined) throw new Error("the join is missing")
			expect(textOf(page, join)).toContain(dictionary.howSkillsLabel)
			expect(textOf(page, join)).toContain(dictionary.howSkillsCopy)
		})

		it(`stars the onboarding skill and links the CLI docs (${language})`, async () => {
			const page = scanComponent(await renderComponent(HowItWorks, { dictionary }))
			const links = elementsByTag(page, "a")
			const star = links.find((element) => element.attributes["href"] === GITHUB_SKILLS_URL)
			const docs = links.find((element) => element.attributes["href"] === DOCS_CLI_PATH)
			if (star === undefined || docs === undefined) throw new Error("a section link is missing")
			expect(textOf(page, star)).toBe(dictionary.starOnboarding)
			expect(textOf(page, docs)).toBe(dictionary.cliDocsLink)
		})
	}
})
