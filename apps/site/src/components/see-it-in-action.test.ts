import { describe, expect, it } from "bun:test"
import { elementsByTag, type HtmlElement, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { COMPARE_ALONE, COMPARE_WITH, sequenceTimeline } from "../lib/motion/timeline"
import { FI_DEMO_COMMAND, FI_DEMO_DATE, FI_DEMO_OUTPUT } from "../lib/site"
import SeeItInAction from "./SeeItInAction.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

/** The messages of one panel, in document order, as the transcript reads them. */
function messagesOf(page: ReturnType<typeof scanComponent>, side: string): readonly HtmlElement[] {
	const panel = withAttribute(page, "data-side", side)[0]
	if (panel === undefined) throw new Error(`the section rendered no ${side} panel`)
	return withClass(page, "chat-message").filter((message) => message.ancestors.includes(panel))
}

/** What one panel says, message by message, with the speaker's label in front of each. */
function exchangeOf(page: ReturnType<typeof scanComponent>, side: string): readonly string[] {
	return messagesOf(page, side).map((message) => textOf(page, message))
}

/** The delay a message's beat starts at, as the component renders it. */
function delaysOf(page: ReturnType<typeof scanComponent>, side: string): readonly string[] {
	return messagesOf(page, side).map((message) => message.attributes["style"] ?? "")
}

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

		it(`opens both transcripts with the same question (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const panels = withClass(page, "compare-panel")
			expect(panels.map((panel) => panel.attributes["data-side"])).toEqual(["without", "with"])
			for (const side of ["without", "with"]) {
				const [first] = exchangeOf(page, side)
				expect(first).toBe(`${dictionary.actionYou} ${dictionary.actionQuestion}`)
			}
		})

		it(`takes the agent alone from its guess to its confession (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const guesses = dictionary.actionGuesses
			expect(exchangeOf(page, "without")).toEqual([
				`${dictionary.actionYou} ${dictionary.actionQuestion}`,
				`${dictionary.actionAgent} ${guesses[0]}`,
				`${dictionary.actionYou} ${dictionary.actionReask}`,
				`${dictionary.actionAgent} ${guesses[1]}`,
				`${dictionary.actionYou} ${dictionary.actionExplain}`,
				`${dictionary.actionAgent} ${dictionary.actionGuessReason}`,
				`${dictionary.actionYou} ${dictionary.actionSure}`,
				`${dictionary.actionAgent} ${dictionary.actionConfession}`,
			])
		})

		it(`takes the agent with traj from the guide question to one grounded answer (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const [, ...spoken] = exchangeOf(page, "with")
			expect(spoken.slice(0, 4)).toEqual([
				`${dictionary.actionAgent} ${dictionary.actionGuideQuestion}`,
				`${dictionary.actionYou} ${dictionary.actionAttach} ${dictionary.actionAttachName}`,
				`${dictionary.actionAgent} ${dictionary.actionNeedMore}`,
				`${dictionary.actionYou} ${dictionary.actionData}`,
			])
			// The agent's CLI message carries the skill line and prints the output, then one answer.
			expect(spoken[4]).toContain(dictionary.actionSkillLine)
			expect(spoken[4]).toContain(FI_DEMO_COMMAND)
			expect(spoken[4]).toContain(dictionary.actionExampleNote)
			expect(spoken[5]).toBe(
				`${dictionary.actionAgent} ${dictionary.actionAnswer} ${dictionary.actionProvenance}`,
			)
		})

		it(`shows the CLI command and its JSON one line per element (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const lines = withClass(page, "terminal-line").map((element) => textOf(page, element))
			expect(lines).toHaveLength(FI_DEMO_OUTPUT.length)
			expect(lines.join("\n")).toContain(FI_DEMO_DATE)
			expect(lines[0]).toBe("{")
		})

		it(`carries the budget sheet as a label, so the Site promises no upload (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const [pill] = withClass(page, "chat-file")
			if (pill === undefined) throw new Error("the transcript shows no file pill")
			expect(textOf(page, pill)).toBe(dictionary.actionAttachName)
			expect(elementsByTag(page, "input")).toHaveLength(0)
			expect(
				page.elements.filter(
					(element) => ["button", "a"].includes(element.tag) && element.ancestors.includes(pill),
				),
			).toHaveLength(0)
		})

		it(`gives every message and every output line its own beat (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const alone = sequenceTimeline(COMPARE_ALONE)
			const guided = sequenceTimeline(COMPARE_WITH)
			expect(messagesOf(page, "without")).toHaveLength(alone.beats.length)
			expect(delaysOf(page, "without")).toEqual(
				alone.beats.map((beat) => `--step-delay:${beat.startMs}ms`),
			)
			// Seven messages, and one beat per line the CLI prints, with no beat unused.
			expect(messagesOf(page, "with")).toHaveLength(guided.beats.length - FI_DEMO_OUTPUT.length)
			expect(withClass(page, "terminal-line")).toHaveLength(FI_DEMO_OUTPUT.length)
			const last = guided.beats.at(-1)
			const [answer] = messagesOf(page, "with").slice(-1)
			if (answer === undefined || last === undefined) throw new Error("the answer has no beat")
			expect(answer.attributes["style"]).toBe(`--step-delay:${last.startMs}ms`)
			// The Reveal layer reads each panel's own length, and the side the Replay control replays.
			expect(
				withAttribute(page, "data-play-ms").map((panel) => panel.attributes["data-play-ms"]),
			).toEqual([String(alone.totalMs), String(guided.totalMs)])
		})

		it(`carries no run label, because both panels are conversations now (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const words = page.text.map((run) => run.text).join(" ")
			expect(withClass(page, "run-label")).toHaveLength(0)
			expect(words).not.toContain("Run 1")
		})

		it(`offers the Replay control only where a script can reach it (${language})`, async () => {
			const page = scanComponent(await renderComponent(SeeItInAction, { dictionary }))
			const replays = page.elements.filter((element) => "data-replay" in element.attributes)
			expect(replays.map((element) => element.tag)).toEqual(["button"])
			expect(replays[0]?.attributes["type"]).toBe("button")
			expect(replays[0]?.attributes["hidden"]).toBeDefined()
			expect(withAttribute(page, "data-replay").map((one) => one.attributes["aria-label"])).toEqual(
				[`${dictionary.replay} — ${dictionary.actionWithoutLabel}`],
			)
			// The control names the side it replays, so the Reveal layer needs no lookup of its own.
			expect(
				withAttribute(page, "data-replay").map((one) => one.attributes["data-replay"]),
			).toEqual(["without"])
		})

		it(`ships no motion attribute, because the static page is the whole story (${language})`, async () => {
			const html = await renderComponent(SeeItInAction, { dictionary })
			expect(html).not.toContain("data-motion")
			expect(html).not.toContain("data-step")
		})
	}
})
