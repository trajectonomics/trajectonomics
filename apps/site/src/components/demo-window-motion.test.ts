import { describe, expect, it } from "bun:test"
import { textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import {
	COMPARE_ALONE,
	COMPARE_WITH,
	HINT_MS,
	sequenceTimeline,
	typing,
} from "../lib/motion/timeline"
import { DEMO_SKILL_COMMAND, FI_DEMO_OUTPUT } from "../lib/site"
import DemoWindow from "./DemoWindow.astro"
import { messagesOf } from "./testing/demo"
import { renderComponent } from "./testing/render"
import { scanComponent, withAttribute, withClass } from "./testing/scan"

/** The number of keys a prompt takes to type: its characters, not its UTF-16 units. */
const keysOf = (text: string) => [...text].length

describe("the demo window's choreography in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary
		const render = async () => scanComponent(await renderComponent(DemoWindow, { dictionary }))

		it(`draws the composers as decoration that types the prompt each chat opens with (${language})`, async () => {
			const page = await render()
			const composers = withClass(page, "app-composer")
			expect(composers.map((one) => one.attributes["aria-hidden"])).toEqual(["true", "true"])
			const typed = withClass(page, "app-typed").map((one) => textOf(page, one))
			expect(typed).toEqual([
				dictionary.actionQuestion,
				`${DEMO_SKILL_COMMAND} ${dictionary.actionQuestion}`,
			])
			expect(withClass(page, "app-placeholder").map((one) => textOf(page, one))).toEqual([
				dictionary.appPlaceholder,
				dictionary.appPlaceholder,
			])
		})

		it(`hands the stylesheet each prompt's own typing times and its key count (${language})`, async () => {
			const page = await render()
			const [alone, guided] = withClass(page, "app-composer")
			const question = dictionary.actionQuestion
			for (const [composer, text] of [
				[alone, question],
				[guided, `${DEMO_SKILL_COMMAND} ${question}`],
			] as const) {
				const typed = typing(keysOf(text))
				expect(composer?.attributes["style"]).toBe(
					`--type-start:${typed.startMs}ms;--type-ms:${typed.typeMs}ms;--type-sent:${typed.sentMs}ms;--chars:${keysOf(text)}`,
				)
			}
		})

		it(`starts each chat's first message when its prompt is sent, and gives every message its own beat (${language})`, async () => {
			const page = await render()
			const question = dictionary.actionQuestion
			const alone = sequenceTimeline(COMPARE_ALONE, typing(keysOf(question)).sentMs)
			const guided = sequenceTimeline(
				COMPARE_WITH,
				typing(keysOf(`${DEMO_SKILL_COMMAND} ${question}`)).sentMs,
			)
			expect(messagesOf(page, "without")).toHaveLength(alone.beats.length)
			expect(messagesOf(page, "without").map((message) => message.attributes["style"])).toEqual(
				alone.beats.map((beat) => `--step-delay:${beat.startMs}ms`),
			)
			// Seven messages, and one beat per line the CLI prints, with no beat unused.
			expect(messagesOf(page, "with")).toHaveLength(guided.beats.length - FI_DEMO_OUTPUT.length)
			expect(withClass(page, "terminal-line")).toHaveLength(FI_DEMO_OUTPUT.length)
			const last = guided.beats.at(-1)
			const answer = messagesOf(page, "with").at(-1)
			expect(answer?.attributes["style"]).toBe(`--step-delay:${last?.startMs}ms`)
			// The Reveal layer reads each chat's own length, and how long to leave the first one alone.
			expect(
				withAttribute(page, "data-play-ms").map((chat) => chat.attributes["data-play-ms"]),
			).toEqual([String(alone.totalMs), String(guided.totalMs)])
			expect(withAttribute(page, "data-app")[0]?.attributes["data-hint-ms"]).toBe(String(HINT_MS))
		})
	}
})
