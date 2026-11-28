import { describe, expect, it } from "bun:test"
import { elementsByTag, type HtmlElement, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import {
	DEMO_APP_NAME,
	DEMO_SKILL_COMMAND,
	FI_DEMO_COMMAND,
	FI_DEMO_DATE,
	FI_DEMO_OUTPUT,
	FI_DEMO_SETUP_COMMANDS,
} from "../lib/site"
import DemoWindow from "./DemoWindow.astro"
import { chatOf, exchangeOf } from "./testing/demo"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

describe("the demo window in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary
		const render = async () => scanComponent(await renderComponent(DemoWindow, { dictionary }))

		it(`carries no heading: the hero's one h1 is the page's claim (${language})`, async () => {
			expect(headings(await render())).toEqual([])
		})

		it(`draws a window titled with the app's name, and two chats in the order the demo plays them (${language})`, async () => {
			const page = await render()
			const [title] = withClass(page, "app-title")
			expect(textOf(page, title as HtmlElement)).toBe(DEMO_APP_NAME)
			expect(withClass(page, "app-chat").map((chat) => chat.attributes["data-chat"])).toEqual([
				"without",
				"with",
			])
		})

		it(`tells the two chats apart by title and by tag (${language})`, async () => {
			const page = await render()
			expect(withClass(page, "app-chat-title").map((one) => textOf(page, one))).toEqual([
				dictionary.appTitleWithout,
				dictionary.appTitleWith,
			])
			expect(withClass(page, "app-chat-tag").map((one) => textOf(page, one))).toEqual([
				dictionary.actionWithoutLabel,
				dictionary.actionWithLabel,
			])
		})

		it(`ships no stage, so a page with no script shows both chats whole (${language})`, async () => {
			const html = await renderComponent(DemoWindow, { dictionary })
			expect(html).not.toContain("data-stage")
			expect(html).not.toContain("data-motion")
			expect(html).not.toContain("data-hint=")
			expect(withAttribute(scanComponent(html), "data-app")).toHaveLength(1)
		})

		it(`ships its controls disabled and its sidebar out of the reading order, so none is offered that cannot work (${language})`, async () => {
			const page = await render()
			const side = withAttribute(page, "data-app-side")[0]
			expect(side?.attributes["aria-hidden"]).toBe("true")
			const buttons = elementsByTag(page, "button").filter((button) =>
				button.ancestors.includes(side as HtmlElement),
			)
			expect(buttons.map((button) => textOf(page, button))).toEqual([
				dictionary.appNewChat,
				dictionary.appTitleWithout,
				dictionary.appTitleWith,
			])
			for (const button of buttons) {
				expect(button.attributes["type"]).toBe("button")
				expect("disabled" in button.attributes).toBe(true)
			}
			expect(
				withAttribute(page, "data-app-chat").map((button) => button.attributes["data-app-chat"]),
			).toEqual(["without", "with"])
			const replay = withAttribute(page, "data-app-replay")[0]
			expect(replay?.tag).toBe("button")
			expect("hidden" in (replay?.attributes ?? {})).toBe(true)
			expect(textOf(page, replay as HtmlElement)).toBe(dictionary.replay)
		})

		it(`labels each transcript as a region, and leaves it out of the Tab order until it scrolls (${language})`, async () => {
			const page = await render()
			const regions = withClass(page, "app-scroll")
			expect(regions.map((region) => region.attributes["role"])).toEqual(["region", "region"])
			expect(regions.map((region) => region.attributes["aria-label"])).toEqual([
				dictionary.appTitleWithout,
				dictionary.appTitleWith,
			])
			expect(regions.every((region) => !("tabindex" in region.attributes))).toBe(true)
		})

		it(`opens both chats with the same question, and the skill's command only in the second (${language})`, async () => {
			const page = await render()
			const [first] = exchangeOf(page, "without")
			expect(first).toBe(`${dictionary.actionYou} ${dictionary.actionQuestion}`)
			const [second] = exchangeOf(page, "with")
			expect(second).toBe(
				`${dictionary.actionYou} ${DEMO_SKILL_COMMAND} ${dictionary.actionQuestion}`,
			)
		})

		it(`takes the agent alone from its guess to its confession (${language})`, async () => {
			const page = await render()
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
			const page = await render()
			const [, ...spoken] = exchangeOf(page, "with")
			expect(spoken.slice(0, 4)).toEqual([
				`${dictionary.actionAgent} ${dictionary.actionGuideQuestion}`,
				`${dictionary.actionYou} ${dictionary.actionAttach} ${dictionary.actionAttachName}`,
				`${dictionary.actionAgent} ${dictionary.actionNeedMore}`,
				`${dictionary.actionYou} ${dictionary.actionData}`,
			])
			expect(spoken[4]).toContain(dictionary.actionSkillLine)
			expect(spoken[4]).toContain(FI_DEMO_COMMAND)
			expect(spoken[4]).toContain(dictionary.actionExampleNote)
			expect(spoken[5]).toBe(
				`${dictionary.actionAgent} ${dictionary.actionAnswer} ${dictionary.actionProvenance}`,
			)
		})

		it(`ends each chat on its verdict, said once under the transcript (${language})`, async () => {
			const page = await render()
			const verdicts = withClass(page, "app-verdict")
			expect(verdicts.map((one) => textOf(page, one))).toEqual([
				dictionary.actionWithoutNote,
				dictionary.actionWithNote,
			])
			for (const [index, side] of ["without", "with"].entries()) {
				expect(verdicts[index]?.ancestors.includes(chatOf(page, side))).toBe(true)
			}
		})

		it(`shows the setup, the CLI command and its JSON one line per element (${language})`, async () => {
			const page = await render()
			const commands = withClass(page, "terminal-command").map((element) => textOf(page, element))
			expect(commands).toEqual([
				...FI_DEMO_SETUP_COMMANDS.map((command) => `$ ${command}`),
				`$ ${FI_DEMO_COMMAND}`,
			])
			const lines = withClass(page, "terminal-line").map((element) => textOf(page, element))
			expect(lines).toHaveLength(FI_DEMO_OUTPUT.length)
			expect(lines.join("\n")).toContain(FI_DEMO_DATE)
			expect(lines[0]).toBe("{")
		})

		it(`carries the budget sheet as a label, so the Site promises no upload (${language})`, async () => {
			const page = await render()
			const [pill] = withClass(page, "chat-file")
			if (pill === undefined) throw new Error("the transcript shows no file pill")
			expect(textOf(page, pill)).toBe(dictionary.actionAttachName)
			expect(elementsByTag(page, "input")).toHaveLength(0)
			expect(elementsByTag(page, "textarea")).toHaveLength(0)
		})

		it(`carries no run label and no tab bar, because the window holds chats and not panels (${language})`, async () => {
			const page = await render()
			const words = page.text.map((run) => run.text).join(" ")
			expect(withClass(page, "run-label")).toHaveLength(0)
			expect(words).not.toContain("Run 1")
			expect(withClass(page, "compare-tab")).toHaveLength(0)
			expect(withAttribute(page, "data-action-compare")).toHaveLength(0)
		})
	}
})
