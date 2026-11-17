import { describe, expect, it } from "bun:test"
import { elementsByTag, isInlineScript, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { INSTALL_COMMAND } from "../lib/site"
import Hero from "./Hero.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

describe("the Hero component in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary

		it(`makes the page's one claim: one h1, no other heading (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			expect(headings(page).map((element) => element.tag)).toEqual(["h1"])
		})

		it(`carries the plain run and the accent in the h1 (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const h1 = elementsByTag(page, "h1")[0]
			if (h1 === undefined) throw new Error("the hero rendered no h1")
			expect(textOf(page, h1)).toBe(
				[dictionary.heroHeadingPrefix, dictionary.heroHeadingAccent].join(" "),
			)
		})

		it(`highlights only the accent, and never cycles it (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const accent = withAttribute(page, "data-hero-accent")
			expect(accent.map((element) => textOf(page, element))).toEqual([dictionary.heroHeadingAccent])
			expect(withAttribute(page, "data-hero-stack")).toEqual([])
			expect(accent[0]?.attributes["class"]).toContain("text-accent")
		})

		it(`shows the release pill above the headline: the version, a hairline, the licence (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const pill = withClass(page, "hero-pill")[0]
			if (pill === undefined) throw new Error("the hero rendered no release pill")
			expect(textOf(page, pill)).toContain(dictionary.heroVersion)
			expect(textOf(page, pill)).toContain(dictionary.heroLicence)
			const hair = page.elements.find(
				(element) =>
					element.attributes["data-slot"] === "separator" && element.ancestors.includes(pill),
			)
			expect(hair).toBeDefined()
		})

		it(`marks the command name in the subline as code (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const codes = elementsByTag(page, "code").map((element) => textOf(page, element))
			expect(codes).toContain("traj")
		})

		it(`renders the install command and the steps under it (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const command = withAttribute(page, "data-install-command")[0]
			if (command === undefined) throw new Error("the hero rendered no install command")
			expect(textOf(page, command)).toBe(INSTALL_COMMAND)
			expect(withClass(page, "window-step").map((step) => textOf(page, step))).toEqual([
				...dictionary.stepLabels,
			])
		})

		it(`answers a click with a ripple, and never follows the pointer (${language})`, async () => {
			const html = await renderComponent(Hero, { dictionary })
			const page = scanComponent(html)
			expect(page.elements.some(isInlineScript)).toBe(true)
			expect(withAttribute(page, "data-hero").length).toBe(1)
			expect(withAttribute(page, "data-ripple").length).toBe(1)
			expect(withAttribute(page, "data-pointer-glow")).toEqual([])
			expect(html).toContain('addEventListener("click"')
			expect(html).not.toContain("pointermove")
			expect(html).not.toContain("pointerleave")
		})

		it(`sets the headline bold and the accent in the accent colour (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const h1 = elementsByTag(page, "h1")[0]
			expect(h1?.attributes["class"]).toContain("font-bold")
			expect(h1?.attributes["class"]).not.toContain("font-light")
		})
	}
})
