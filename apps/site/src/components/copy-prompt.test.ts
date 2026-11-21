import { describe, expect, it } from "bun:test"
import { elementsByTag, isInlineScript, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { DOCS_CLI_INSTALL_PATH, INSTALL_PROMPT } from "../lib/site"
import CopyPrompt from "./CopyPrompt.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

describe("the CopyPrompt component in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary
		const render = async () => scanComponent(await renderComponent(CopyPrompt, { dictionary }))

		it(`shows the prompt in its code element (${language})`, async () => {
			const page = await render()
			const prompt = withAttribute(page, "data-install-prompt")[0]
			if (prompt === undefined) throw new Error("no prompt rendered")
			expect(prompt.tag).toBe("code")
			expect(textOf(page, prompt)).toBe(INSTALL_PROMPT)
		})

		it(`marks its window, so a built-file rule can judge it alone (${language})`, async () => {
			const page = await render()
			const windows = withAttribute(page, "data-install-window")
			expect(windows).toHaveLength(1)
			const window = windows[0]
			const prompt = withAttribute(page, "data-install-prompt")[0]
			const exit = withClass(page, "window-exit")[0]
			if (window === undefined || prompt === undefined || exit === undefined) {
				throw new Error("the window, its prompt or its way out is missing")
			}
			expect(prompt.ancestors.includes(window)).toBe(true)
			expect(exit.ancestors.includes(window)).toBe(true)
		})

		it(`shows the prompt and no second code in the window (${language})`, async () => {
			const page = await render()
			expect(elementsByTag(page, "code").map((code) => textOf(page, code))).toEqual([
				INSTALL_PROMPT,
			])
		})

		it(`ships the copy button hidden, with its labels as data (${language})`, async () => {
			const page = await render()
			const button = withAttribute(page, "data-copy-prompt")[0]
			if (button === undefined) throw new Error("no copy button rendered")
			expect(button.tag).toBe("button")
			expect(button.attributes["type"]).toBe("button")
			expect("hidden" in button.attributes).toBe(true)
			expect(button.attributes["data-copied"]).toBe(dictionary.copied)
			expect(button.attributes["data-copied-label"]).toBe(dictionary.copiedLabel)
			expect(button.attributes["data-copy-failed"]).toBe(dictionary.copyFailed)
			expect(textOf(page, button)).toBe(dictionary.copy)
		})

		it(`sets the Copy button and the way out side by side, as two buttons and no card (${language})`, async () => {
			const page = await render()
			const button = withAttribute(page, "data-copy-prompt")[0]
			const exit = withClass(page, "window-exit")[0]
			const row = withClass(page, "install-row")[0]
			if (button === undefined || exit === undefined || row === undefined)
				throw new Error("the row, its Copy button or its way out is missing")
			expect(button.ancestors.at(-1)).toBe(row)
			expect(exit.ancestors.at(-1)).toBe(row)
			// The row is a plain wrapper, not a stacked column inside a bordered card.
			expect(row.attributes["class"]).not.toContain("flex-col")
			expect(withAttribute(page, "data-slot", "card")).toEqual([])
			// Both controls are bevelled at the bottom right, as twenty.com's pair is.
			expect("data-bevel" in button.attributes).toBe(true)
			expect("data-bevel" in exit.attributes).toBe(true)
		})

		it(`has a polite status line for the copy result (${language})`, async () => {
			const page = await render()
			const status = withAttribute(page, "data-copy-status")[0]
			if (status === undefined) throw new Error("no copy status rendered")
			expect(status.attributes["role"]).toBe("status")
			expect(status.attributes["aria-live"]).toBe("polite")
			expect(status.attributes["aria-atomic"]).toBe("true")
		})

		it(`clears the notification after six seconds (${language})`, async () => {
			const page = await render()
			const button = withAttribute(page, "data-copy-prompt")[0]
			if (button === undefined) throw new Error("no copy button rendered")
			expect(button.attributes["data-notice-timeout"]).toBe("6000")
		})

		it(`floats the copy toast, whose countdown line a reader never hears (${language})`, async () => {
			const page = await render()
			const toast = withAttribute(page, "data-copy-toast")[0]
			const status = withAttribute(page, "data-copy-status")[0]
			const countdown = withClass(page, "copy-toast-countdown")[0]
			if (toast === undefined) throw new Error("no copy toast rendered")
			if (status === undefined) throw new Error("no copy status rendered")
			expect(status.ancestors.includes(toast)).toBe(true)
			expect(countdown?.attributes["aria-hidden"]).toBe("true")
		})

		it(`shows the way out of the prompt, one link under it (${language})`, async () => {
			const page = await render()
			const exits = withClass(page, "window-exit")
			expect(exits).toHaveLength(1)
			const exit = exits[0]
			if (exit === undefined) throw new Error("no way out rendered")
			expect(exit.tag).toBe("a")
			expect(exit.attributes["href"]).toBe(DOCS_CLI_INSTALL_PATH)
			expect(textOf(page, exit)).toBe(dictionary.cliInstallLink)
		})

		it(`puts the way out under the prompt, inside the same window (${language})`, async () => {
			const page = await render()
			const window = withAttribute(page, "data-install-window")[0]
			const prompt = withAttribute(page, "data-install-prompt")[0]
			const exit = withClass(page, "window-exit")[0]
			if (window === undefined || prompt === undefined || exit === undefined) {
				throw new Error("the window, its prompt or its way out is missing")
			}
			expect(exit.ancestors.includes(window)).toBe(true)
			expect(page.elements.indexOf(exit)).toBeGreaterThan(page.elements.indexOf(prompt))
		})

		it(`draws the way out with the arrow as decoration (${language})`, async () => {
			const page = await render()
			const exit = withClass(page, "window-exit")[0]
			if (exit === undefined) throw new Error("no way out rendered")
			const arrow = page.elements.find(
				(element) => element.tag === "svg" && element.ancestors.includes(exit),
			)
			expect(arrow?.attributes["aria-hidden"]).toBe("true")
		})

		it(`carries its inline script and no heading (${language})`, async () => {
			const page = await render()
			expect(page.elements.some(isInlineScript)).toBe(true)
			expect(headings(page)).toEqual([])
		})

		it(`offers one action besides the way out: no undo, no second control (${language})`, async () => {
			const page = await render()
			expect(elementsByTag(page, "button")).toHaveLength(1)
			expect(elementsByTag(page, "a")).toHaveLength(1)
		})

		it(`shows only two controls, with the prompt kept out of view for Copy to read (${language})`, async () => {
			const page = await render()
			const prompt = withAttribute(page, "data-install-prompt")[0]
			if (prompt === undefined) throw new Error("no prompt rendered")
			expect("hidden" in prompt.attributes).toBe(true)
			expect(withClass(page, "install-row")).toHaveLength(1)
			expect(elementsByTag(page, "button")).toHaveLength(1)
			expect(elementsByTag(page, "a")).toHaveLength(1)
		})
	}
})
