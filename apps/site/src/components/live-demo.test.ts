import { describe, expect, it } from "bun:test"
import { elementsByTag, isInlineScript, type ScannedPage, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { DEMO_PATH } from "../lib/site"
import LiveDemo from "./LiveDemo.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

/** The one element the component renders for an attribute it must carry exactly one of. */
function one(page: ScannedPage, name: string, value?: string) {
	const [element] = withAttribute(page, name, value)
	if (element === undefined) throw new Error(`the section rendered no [${name}]`)
	return element
}

/** The words of the one element carrying a class token. */
function textWithClass(page: ScannedPage, token: string): readonly string[] {
	return withClass(page, token).map((element) => textOf(page, element))
}

describe("the live Demo section in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary
		const render = async () => scanComponent(await renderComponent(LiveDemo, { dictionary }))

		it(`carries one h2 and no deeper heading, so the section is a peer of its neighbours (${language})`, async () => {
			const page = await render()
			expect(headings(page).map((element) => element.tag)).toEqual(["h2"])
			expect(textWithClass(page, "section-heading")).toEqual([dictionary.liveDemoHeading])
			expect(textWithClass(page, "eyebrow")).toEqual([dictionary.liveDemoEyebrow])
			expect(textWithClass(page, "section-lede")).toEqual([dictionary.liveDemoLead])
		})

		it(`embeds the hosted Demo by its one path, titles it and loads it lazily (${language})`, async () => {
			const page = await render()
			const [frame] = elementsByTag(page, "iframe")
			if (frame === undefined) throw new Error("the section rendered no iframe")
			expect(frame.attributes["src"]).toBe(DEMO_PATH)
			expect(frame.attributes["title"]).toBe(dictionary.liveDemoFrameTitle)
			expect(frame.attributes["loading"]).toBe("lazy")
			expect(withAttribute(page, "data-live-viewport")).toHaveLength(1)
		})

		it(`offers the zoom, the reset and the way out, with every control disabled (${language})`, async () => {
			const page = await render()
			const buttons = elementsByTag(page, "button")
			expect(buttons).toHaveLength(3)
			expect(
				buttons.map(
					(button) =>
						"data-live-out" in button.attributes ||
						"data-live-reset" in button.attributes ||
						"data-live-in" in button.attributes,
				),
			).toEqual([true, true, true])
			// The reset button's name starts with the level it shows, then says what it does.
			expect(
				buttons.map((button) => textOf(page, button)).filter((text) => text.length > 0),
			).toEqual([`100% ${dictionary.liveDemoZoomReset}`])
			// Both zoom glyphs are drawings, not characters: text in an icon button is text axe cannot
			// judge the contrast of, and a glyph that is not text also cannot mismatch its label.
			const icons = elementsByTag(page, "svg")
			expect(icons).toHaveLength(2)
			for (const icon of icons) expect(icon.attributes["aria-hidden"]).toBe("true")
			for (const button of buttons) {
				expect(button.attributes["type"]).toBe("button")
				expect("disabled" in button.attributes).toBe(true)
			}
			expect(buttons.map((button) => button.attributes["aria-label"])).toEqual([
				dictionary.liveDemoZoomOut,
				undefined,
				dictionary.liveDemoZoomIn,
			])
			expect(one(page, "role", "status").attributes["data-live-said"]).toBe("")
			expect(one(page, "role", "group").attributes["aria-label"]).toBe(dictionary.liveDemoZoom)
			const [open] = elementsByTag(page, "a")
			if (open === undefined) throw new Error("the section rendered no way out")
			expect(open.attributes["href"]).toBe(DEMO_PATH)
			expect(textOf(page, open)).toBe(dictionary.liveDemoOpen)
			expect(textWithClass(page, "live-title")).toEqual([dictionary.liveDemoTitle])
			expect(withAttribute(page, "data-live-level")).toHaveLength(1)
		})

		it(`starts at browser zoom 100%, and carries the inline script that runs the steps (${language})`, async () => {
			const html = await renderComponent(LiveDemo, { dictionary })
			const page = scanComponent(html)
			expect(one(page, "data-live-viewport").attributes["style"]).toContain("--zoom:1")
			expect(page.text.some((run) => run.text.includes("100%"))).toBe(true)
			expect(page.elements.some(isInlineScript)).toBe(true)
			expect(html).toContain('querySelector("[data-live]")')
			expect(html).toContain("[50, 67, 75, 80, 90, 100, 110, 125]")
		})
	}
})
