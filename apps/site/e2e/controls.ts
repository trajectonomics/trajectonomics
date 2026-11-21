import { expect, type Page } from "@playwright/test"
import type { Language } from "../src/lib/language/language"
import { dictionaryFor } from "../src/lib/language/languages"
import { INSTALL_PROMPT } from "../src/lib/site"

/** The controls a keyboard visitor can reach, excluding anything hidden or disabled. */
const FOCUSABLE = "a[href], button:not([disabled]):not([hidden]), summary"

/** The number of controls a keyboard visitor can reach on the page. */
export function focusableCount(page: Page): Promise<number> {
	return page.evaluate(
		(selector) =>
			// A closed <details> keeps its panel laid out but out of the tab order, so only the
			// summary and the controls outside every closed panel are counted.
			[...document.querySelectorAll(selector)].filter((element) => {
				const panel = element.closest("details:not([open])")
				if (panel !== null && element.tagName !== "SUMMARY") return false
				// A tab bar hidden at this width is out of the browser's tab order too, so it must
				// not be counted here (the comparison's phone tabs are hidden on a desktop).
				return element.getClientRects().length > 0
			}).length,
		FOCUSABLE,
	)
}

/** Whether the focused control paints a ring in a `--ds-*` role: an outline or a box shadow. */
export function ringVisible(page: Page): Promise<boolean> {
	return page.evaluate(() => {
		const focused = document.activeElement
		if (!(focused instanceof HTMLElement)) return false
		const token = getComputedStyle(document.documentElement)
			.getPropertyValue("--ds-color-ring")
			.trim()
		if (token === "") return false
		const probe = document.createElement("span")
		probe.style.color = token
		document.body.append(probe)
		const ring = getComputedStyle(probe).color
		probe.remove()
		const style = getComputedStyle(focused)
		const outline =
			style.outlineStyle !== "none" &&
			Number.parseFloat(style.outlineWidth) > 0 &&
			style.outlineColor === ring
		return outline || (style.boxShadow !== "none" && style.boxShadow.includes(ring))
	})
}

/** Press Tab until the Copy button has focus, and return whether it gets there at all. */
export async function tabToCopyButton(page: Page): Promise<boolean> {
	const count = await focusableCount(page)
	for (let press = 0; press < count; press++) {
		await page.keyboard.press("Tab")
		const onCopy = await page.evaluate(
			() => document.activeElement?.hasAttribute("data-copy-prompt") ?? false,
		)
		if (onCopy) return true
	}
	return false
}

/** The dictionary string one Language announces after a copy. */
export function copiedMessage(language: Language): string {
	return dictionaryFor(language).copied
}

/** The short word one Language puts on the Copy button while the notice lasts. */
export function copiedLabel(language: Language): string {
	return dictionaryFor(language).copiedLabel
}

/** The prompt a copy puts on the clipboard. */
export const COPY_PROMPT_TEXT = INSTALL_PROMPT

/**
 * The pulse's dot waits in the logic layer, whatever the width: its travel is the layer's own height,
 * and the dot is painted at the foot of the pulse's column.
 */
export async function expectPulseInLogicLayer(page: Page): Promise<void> {
	const dot = await page.locator(".layers-pulse").boundingBox()
	const logic = await page.locator(".how .layer-logic").boundingBox()
	if (dot === null || logic === null) throw new Error("the pulse or the logic layer has no box")
	const dotCentre = dot.y + dot.height - 3
	expect(dotCentre, "the dot is inside the logic layer").toBeGreaterThan(logic.y)
	expect(dotCentre, "the dot is inside the logic layer").toBeLessThan(logic.y + logic.height)
}
