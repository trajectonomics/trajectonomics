import { describe, expect, it } from "bun:test"
import { elementsByTag, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { DOCS_CLI_INSTALL_PATH } from "../lib/site"
import Closing from "./Closing.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent } from "./testing/scan"

describe("the closing section in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`carries one h2 with the closing heading (${language})`, async () => {
			const page = scanComponent(await renderComponent(Closing, { dictionary }))
			expect(headings(page).map((element) => element.tag)).toEqual(["h2"])
			const h2 = elementsByTag(page, "h2")[0]
			if (h2 === undefined) throw new Error("the section rendered no h2")
			expect(textOf(page, h2)).toBe(dictionary.ctaHeading)
		})

		it(`offers no second Copy control and no visible prompt, only two links (${language})`, async () => {
			const page = scanComponent(await renderComponent(Closing, { dictionary }))
			expect(elementsByTag(page, "button")).toHaveLength(0)
			expect(elementsByTag(page, "code")).toHaveLength(0)
			const links = elementsByTag(page, "a").map((anchor) => ({
				href: anchor.attributes["href"],
				text: textOf(page, anchor).trim(),
			}))
			expect(links).toEqual([
				{ href: "#install", text: dictionary.ctaPromptLink },
				{ href: DOCS_CLI_INSTALL_PATH, text: dictionary.cliInstallLink },
			])
		})
	}
})
