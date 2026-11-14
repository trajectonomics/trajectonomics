import { describe, expect, it } from "bun:test"
import { isInlineScript, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { INSTALL_COMMAND } from "../lib/site"
import CopyCommand from "./CopyCommand.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute } from "./testing/scan"

describe("the CopyCommand component in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`shows the install command in its code element (${language})`, async () => {
			const page = scanComponent(await renderComponent(CopyCommand, { dictionary }))
			const command = withAttribute(page, "data-install-command")[0]
			if (command === undefined) throw new Error("no install command rendered")
			expect(command.tag).toBe("code")
			expect(textOf(page, command)).toBe(INSTALL_COMMAND)
		})

		it(`ships the copy button hidden, with its labels as data (${language})`, async () => {
			const page = scanComponent(await renderComponent(CopyCommand, { dictionary }))
			const button = withAttribute(page, "data-copy-command")[0]
			if (button === undefined) throw new Error("no copy button rendered")
			expect(button.tag).toBe("button")
			expect(button.attributes["type"]).toBe("button")
			expect("hidden" in button.attributes).toBe(true)
			expect(button.attributes["data-copied"]).toBe(dictionary.copied)
			expect(button.attributes["data-copy-failed"]).toBe(dictionary.copyFailed)
			expect(textOf(page, button)).toBe(dictionary.copy)
		})

		it(`has a polite status line for the copy result (${language})`, async () => {
			const page = scanComponent(await renderComponent(CopyCommand, { dictionary }))
			const status = withAttribute(page, "data-copy-status")[0]
			if (status === undefined) throw new Error("no copy status rendered")
			expect(status.attributes["role"]).toBe("status")
			expect(status.attributes["aria-live"]).toBe("polite")
			expect(status.attributes["aria-atomic"]).toBe("true")
		})

		it(`carries its inline script and no heading (${language})`, async () => {
			const page = scanComponent(await renderComponent(CopyCommand, { dictionary }))
			expect(page.elements.some(isInlineScript)).toBe(true)
			expect(headings(page)).toEqual([])
		})
	}
})
