import { describe, expect, it } from "bun:test"
import { elementsByTag, isInlineScript, type ScannedPage, textOf } from "../lib/build/html"
import { LANGUAGES, languageEntry } from "../lib/language/languages"
import { DEMO_PATH } from "../lib/site"
import LiveWindow from "./LiveWindow.astro"
import { renderComponent } from "./testing/render"
import { headings, scanComponent, withAttribute, withClass } from "./testing/scan"

/** The one element the component renders for an attribute it must carry exactly one of. */
function one(page: ScannedPage, name: string, value?: string) {
	const [element] = withAttribute(page, name, value)
	if (element === undefined) throw new Error(`the window rendered no [${name}]`)
	return element
}

/** The words of the one element carrying a class token. */
function textWithClass(page: ScannedPage, token: string): readonly string[] {
	return withClass(page, token).map((element) => textOf(page, element))
}

/** Whether an element sits inside the `<noscript>` a scripted page never renders. */
function inNoScript(element: { readonly ancestors: readonly { readonly tag: string }[] }): boolean {
	return element.ancestors.some((ancestor) => ancestor.tag === "noscript")
}

describe("the hero's live window in every Language", () => {
	for (const { language } of LANGUAGES) {
		const dictionary = languageEntry(language).dictionary
		const render = async () => scanComponent(await renderComponent(LiveWindow, { dictionary }))

		it(`is the window itself and no section: no heading, eyebrow or lead (${language})`, async () => {
			const page = await render()
			expect(headings(page)).toEqual([])
			expect(withClass(page, "eyebrow")).toEqual([])
			expect(withClass(page, "section-heading")).toEqual([])
			expect(withClass(page, "section-lede")).toEqual([])
		})

		it(`starts the hosted Demo from a facade link inside its viewport (${language})`, async () => {
			const page = await render()
			const start = one(page, "data-live-start")
			expect(start.tag).toBe("a")
			expect(start.attributes["href"]).toBe(DEMO_PATH)
			expect(textOf(page, start)).toBe(dictionary.liveDemoStart)
			expect(start.attributes["data-live-title"]).toBe(dictionary.liveDemoFrameTitle)
			const viewport = one(page, "data-live-viewport")
			expect(start.ancestors.includes(viewport)).toBe(true)
		})

		it(`embeds the hosted Demo only in <noscript>, titled and lazy, for a visitor with no script (${language})`, async () => {
			const page = await render()
			const frames = elementsByTag(page, "iframe")
			expect(frames).toHaveLength(1)
			const [frame] = frames
			if (frame === undefined) throw new Error("the window rendered no iframe")
			expect(inNoScript(frame), "the iframe sits inside <noscript>").toBe(true)
			expect(frame.attributes["src"]).toBe(DEMO_PATH)
			expect(frame.attributes["title"]).toBe(dictionary.liveDemoFrameTitle)
			expect(frame.attributes["loading"]).toBe("lazy")
			expect("data-live-frame" in frame.attributes).toBe(true)
			expect(one(page, "data-live-viewport").attributes["style"]).toContain("--zoom:1")
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
			const [open] = elementsByTag(page, "a").filter(
				(anchor) => !("data-live-start" in anchor.attributes),
			)
			if (open === undefined) throw new Error("the window rendered no way out")
			expect(open.attributes["href"]).toBe(DEMO_PATH)
			expect(textOf(page, open)).toBe(dictionary.liveDemoOpen)
			expect(textWithClass(page, "live-title")).toEqual([dictionary.liveDemoTitle])
			expect(withAttribute(page, "data-live-level")).toHaveLength(1)
		})

		it(`starts at browser zoom 100%, and carries one inline script for the zoom and the load (${language})`, async () => {
			const html = await renderComponent(LiveWindow, { dictionary })
			const page = scanComponent(html)
			expect(one(page, "data-live-viewport").attributes["style"]).toContain("--zoom:1")
			expect(page.text.some((run) => run.text.includes("100%"))).toBe(true)
			expect(page.elements.some(isInlineScript)).toBe(true)
			expect(html).toContain('querySelector("[data-live]")')
			expect(html).toContain("[50, 67, 75, 80, 90, 100, 110, 125]")
			// The facade shows only once the script has marked the window ready, so no script means the
			// <noscript> iframe and no start link.
			expect(html).toContain('setAttribute("data-live-ready", "")')
			expect(html).toContain('setAttribute("data-live-loading", "")')
			expect(html).toContain('["pointerdown", "keydown", "touchstart", "wheel", "scroll"]')
			expect(html).toContain("requestAnimationFrame")
			// A timer would start the Dashboard inside Lighthouse's measurement, which is the cost the
			// facade exists to keep out of it.
			expect(html).not.toContain("setTimeout")
			expect(html).not.toContain("setInterval")
			expect(html).not.toContain("pointermove")
		})
	}
})
