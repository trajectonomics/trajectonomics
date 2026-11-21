import { describe, expect, it } from "bun:test"
import { elementsByTag, isInlineScript, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { INSTALL_PROMPT } from "../lib/site"
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

		it(`carries the demo window inside the hero, after the copy, so it is seen on landing (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const hero = withAttribute(page, "data-hero")[0]
			if (hero === undefined) throw new Error("the hero rendered no stage")
			const windows = withAttribute(page, "data-app")
			expect(windows).toHaveLength(1)
			expect(windows[0]?.ancestors.includes(hero)).toBe(true)
			const h1 = elementsByTag(page, "h1")[0]
			const prompt = withAttribute(page, "data-install-prompt")[0]
			if (h1 === undefined || prompt === undefined || windows[0] === undefined)
				throw new Error("the hero lost its headline, its prompt or its window")
			expect(page.elements.indexOf(h1)).toBeLessThan(page.elements.indexOf(prompt))
			expect(page.elements.indexOf(prompt)).toBeLessThan(page.elements.indexOf(windows[0]))
		})

		it(`lets the pixel field run behind the copy and the window alike (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const hero = withAttribute(page, "data-hero")[0]
			const blast = withClass(page, "hero-blast")[0]
			const window = withAttribute(page, "data-app")[0]
			if (hero === undefined || blast === undefined || window === undefined)
				throw new Error("the hero lost its field or its window")
			// The field is a direct child of the stage, so it spans the copy and the window.
			expect(blast.ancestors.at(-1)).toBe(hero)
			expect(window.ancestors.includes(blast)).toBe(false)
			expect(withClass(page, "hero-ground")).toEqual([])
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

		it(`carries no facts strip, which belongs to the footer (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			expect(withAttribute(page, "data-facts")).toEqual([])
		})

		it(`renders the prompt and no step strip (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const prompt = withAttribute(page, "data-install-prompt")[0]
			if (prompt === undefined) throw new Error("the hero rendered no prompt")
			expect(textOf(page, prompt)).toBe(INSTALL_PROMPT)
			expect(withClass(page, "window-steps")).toEqual([])
			expect(withClass(page, "window-step")).toEqual([])
		})

		it(`draws one rim layer beside the squares, inside the layer that drifts (${language})`, async () => {
			const page = scanComponent(await renderComponent(Hero, { dictionary }))
			const drift = withClass(page, "hero-blast-drift")[0]
			if (drift === undefined) throw new Error("the hero rendered no drift wrapper")
			const rim = withClass(page, "hero-blast-rim")
			expect(rim.length).toBe(1)
			expect(rim[0]?.ancestors.includes(drift)).toBe(true)
			expect(withClass(page, "hero-blast-pixels")[0]?.ancestors.includes(drift)).toBe(true)
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

		it(`sets the headline in regular weight, with the accent in the accent colour and no bold (${language})`, async () => {
			const html = await renderComponent(Hero, { dictionary })
			const page = scanComponent(html)
			const h1 = elementsByTag(page, "h1")[0]
			expect(h1?.attributes["class"]).toContain("font-normal")
			expect(h1?.attributes["class"]).not.toContain("font-bold")
			expect(html).not.toContain("<strong")
		})
	}
})
