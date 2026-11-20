import { describe, expect, it } from "bun:test"
import { elementsByTag, type HtmlElement, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { HOW_FLOW, SEQUENCE_BOUNDS_MS, sequenceTimeline } from "../lib/motion/timeline"
import { DOCS_CLI_PATH, FI_DEMO_DATE, GITHUB_SKILLS_URL } from "../lib/site"
import HowItWorks from "./HowItWorks.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

/** The one element carrying a class token, which a section that renders it once proves by throwing. */
function one(page: ReturnType<typeof scanComponent>, token: string): HtmlElement {
	const [element] = withClass(page, token)
	if (element === undefined) throw new Error(`the section rendered no ${token}`)
	return element
}

describe("the How it works section in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary
		const pageOf = async () => scanComponent(await renderComponent(HowItWorks, { dictionary }))

		it(`carries one h2 and no deeper heading (${language})`, async () => {
			const page = await pageOf()
			expect(headings(page).map((element) => element.tag)).toEqual(["h2"])
			const h2 = elementsByTag(page, "h2")[0]
			if (h2 === undefined) throw new Error("the section rendered no h2")
			expect(textOf(page, h2)).toBe(dictionary.howHeading)
		})

		it(`lists the workflow as four ordered steps, each with its actor (${language})`, async () => {
			const page = await pageOf()
			const steps = withClass(page, "how-step").map((element) => textOf(page, element))
			expect(steps).toEqual(
				dictionary.howSteps.map((step, index) => {
					const number = String(index + 1).padStart(2, "0")
					const actor = dictionary.howStepActors[index]
					return `${number} ${step} ${actor}`
				}),
			)
		})

		it(`marks the running step's stage with a chip naming its actor (${language})`, async () => {
			const page = await pageOf()
			const chips = withAttribute(page, "data-step-chip")
			expect(chips).toHaveLength(4)
			expect(chips.every((chip) => chip.attributes["aria-hidden"] === "true")).toBe(true)
			const byStep = new Map(
				chips.map((chip) => [chip.attributes["data-step-chip"], textOf(page, chip)]),
			)
			expect([...byStep.keys()].sort()).toEqual(["1", "2", "3", "4"])
			expect([1, 2, 3, 4].map((step) => byStep.get(String(step)))).toEqual([
				...dictionary.howStepActors,
			])
		})

		it(`says the agent owns the presentation layer and traj owns the logic layer (${language})`, async () => {
			const page = await pageOf()
			const presentation = one(page, "layer-presentation")
			const logic = one(page, "layer-logic")
			expect(textOf(page, presentation)).toContain(dictionary.howPresentationLabel)
			expect(textOf(page, presentation)).toContain(dictionary.howPresentationOwner)
			for (const item of dictionary.howPresentationItems)
				expect(textOf(page, presentation)).toContain(item)
			expect(textOf(page, logic)).toContain(dictionary.howLogicLabel)
			expect(textOf(page, logic)).toContain(dictionary.howLogicOwner)
			for (const item of dictionary.howLogicItems) expect(textOf(page, logic)).toContain(item)
		})

		it(`names exactly three outputs, because the agent hands back three things (${language})`, async () => {
			const page = await pageOf()
			const presentation = one(page, "layer-presentation")
			const chips = withClass(page, "layer-chip").filter((chip) =>
				chip.ancestors.includes(presentation),
			)
			expect(chips.map((chip) => textOf(page, chip))).toEqual([...dictionary.howPresentationItems])
			expect(chips).toHaveLength(3)
		})

		it(`draws the three outputs simply: a chat, a chart with its value, and an action (${language})`, async () => {
			const page = await pageOf()
			const answer = textOf(page, one(page, "how-output-answer"))
			expect(answer).toBe(dictionary.howOutputChat.join(" "))
			const bars = withClass(page, "how-output-bar")
			expect(bars).toHaveLength(6)
			// The value rides the last, accent bar: it is inside that bar's own markup, not the frame.
			const values = withClass(page, "how-output-value")
			expect(values).toHaveLength(1)
			expect(values[0]?.ancestors.includes(bars.at(-1) as HtmlElement)).toBe(true)
			expect(textOf(page, values[0] as HtmlElement)).toBe(FI_DEMO_DATE.slice(0, 4))
			const action = textOf(page, one(page, "how-output-action"))
			expect(action).toContain(dictionary.howOutputStatus)
			expect(action).toContain(dictionary.howOutputSource)
		})

		it(`puts the skills between the two layers (${language})`, async () => {
			const page = await pageOf()
			const order = page.elements
				.filter((element) =>
					["layer-presentation", "layers-join", "layer-logic"].some((token) =>
						(element.attributes["class"] ?? "").split(/\s+/).includes(token),
					),
				)
				.map((element) => (element.attributes["class"] ?? "").split(/\s+/)[0])
			expect(order).toEqual(["layer", "layers-join", "layer"])
			const join = one(page, "layers-join")
			expect(textOf(page, join)).toContain(dictionary.howSkillsLabel)
			expect(textOf(page, join)).toContain(dictionary.howSkillsCopy)
		})

		it(`carries the pulse inside the layers, and it announces nothing (${language})`, async () => {
			const page = await pageOf()
			const pulse = one(page, "layers-pulse")
			expect(pulse.attributes["aria-hidden"]).toBe("true")
			expect(pulse.ancestors.includes(one(page, "layers"))).toBe(true)
		})

		it(`carries one agent token that rides the steps, and announces nothing (${language})`, async () => {
			const page = await pageOf()
			const tokens = withClass(page, "how-step-token")
			expect(tokens).toHaveLength(1)
			expect(tokens[0]?.attributes["aria-hidden"]).toBe("true")
			// It sits in the list, not inside a row: one element travels, rather than four that blink.
			expect(tokens[0]?.ancestors.includes(one(page, "how-steps"))).toBe(true)
			expect(
				tokens[0]?.ancestors.some((element) => element.attributes["class"] === "how-step"),
			).toBe(false)
		})

		it(`carries the flow's numbers, and no state, until a script starts it (${language})`, async () => {
			const html = await renderComponent(HowItWorks, { dictionary })
			const page = scanComponent(html)
			expect(html).not.toContain("data-motion")
			expect(html).not.toContain("data-step=")
			const how = one(page, "how")
			expect(how.attributes["data-flow-ms"]).toBe(String(HOW_FLOW.beatMs))
			expect(how.attributes["data-flow-steps"]).toBe(String(HOW_FLOW.beats))
			// The flow is the slowest sequence, and it still settles inside its bound.
			expect(sequenceTimeline(HOW_FLOW).totalMs).toBeLessThanOrEqual(SEQUENCE_BOUNDS_MS.flow)
		})

		it(`offers the Replay control only where a script can reach it (${language})`, async () => {
			const page = await pageOf()
			const replays = page.elements.filter((element) => "data-replay" in element.attributes)
			expect(replays.map((element) => element.tag)).toEqual(["button"])
			expect(replays[0]?.attributes["hidden"]).toBeDefined()
			expect(textOf(page, replays[0] as HtmlElement)).toBe(dictionary.replay)
		})

		it(`stars the onboarding skill and links the CLI docs (${language})`, async () => {
			const page = await pageOf()
			const links = elementsByTag(page, "a")
			const star = links.find((element) => element.attributes["href"] === GITHUB_SKILLS_URL)
			const docs = links.find((element) => element.attributes["href"] === DOCS_CLI_PATH)
			if (star === undefined || docs === undefined) throw new Error("a section link is missing")
			expect(textOf(page, star)).toBe(dictionary.starOnboarding)
			expect(textOf(page, docs)).toBe(dictionary.cliDocsLink)
		})
	}
})
