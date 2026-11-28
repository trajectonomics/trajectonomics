import { expect, type Page } from "@playwright/test"
import type { Language } from "../src/lib/language/language"
import { dictionaryFor } from "../src/lib/language/languages"
import { INSTALL_PROMPT } from "../src/lib/site"

/** The controls a keyboard visitor can reach, excluding anything hidden or disabled. */
const FOCUSABLE = 'a[href], button:not([disabled]):not([hidden]), summary, [tabindex="0"]'

/** The number of controls a keyboard visitor can reach on the page. */
export function focusableCount(page: Page): Promise<number> {
	return page.evaluate(
		(selector) =>
			// A closed <details> keeps its panel laid out but out of the tab order, so only the
			// summary and the controls outside every closed panel are counted.
			[...document.querySelectorAll(selector)].filter((element) => {
				const panel = element.closest("details:not([open])")
				if (panel !== null && element.tagName !== "SUMMARY") return false
				// A control the page does not lay out is out of the browser's tab order too, so only
				// a control with client rects is counted.
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

/** The control the focused element is, by tag, href and accessible name; `none` when nothing is. */
export function focusedControl(page: Page): Promise<string> {
	return page.evaluate(() => {
		const focused = document.activeElement
		if (!(focused instanceof HTMLElement)) return "none"
		const href = focused.getAttribute("href") ?? ""
		// The accessible name, not the text: two controls with the same text can have different names.
		const name = focused.getAttribute("aria-label") ?? focused.textContent ?? ""
		return `${focused.tagName}:${href}:${name.trim()}`
	})
}

/** Wait for the focused control to paint its ring, so a busy machine cannot beat the transition. */
export async function expectRingVisible(page: Page, label: string): Promise<void> {
	await expect.poll(() => ringVisible(page), { message: label, timeout: 5_000 }).toBe(true)
}

/**
 * Start the hero's live Dashboard and wait for it, without a keypress: the window drops its facade once
 * the frame has loaded, which would change the page's controls under a keyboard walk (ADR 0035).
 */
export async function startLiveDemo(page: Page): Promise<void> {
	await page.evaluate(() => window.dispatchEvent(new Event("scroll")))
	await expect(page.locator("[data-live-start]")).toHaveCount(0, { timeout: 20_000 })
	await expect(
		page.frameLocator("iframe[data-live-frame]").getByRole("heading", {
			name: /this is your current situation/,
			level: 1,
		}),
	).toBeVisible({ timeout: 20_000 })
}

/**
 * Put focus on the embedded iframe's last control and press Tab until the keyboard leaves the frame.
 * The frame's own tab stops are the Dashboard's to test; this checks that the keyboard leaves the frame
 * onto the document's next control, so the Site's controls on both sides are still reached in order.
 *
 * Focusing the frame's last control is a best guess: the Dashboard may still be hydrating or
 * re-rendering, so the element is not always the frame's real last stop and one Tab can land on
 * another control inside it. A keyboard visitor only needs Tab to leave the frame eventually, so this
 * presses Tab again, at most once per control the frame shows, and fails only when the frame keeps
 * focus: a real focus trap.
 */
export async function tabOutOfFrame(page: Page): Promise<boolean> {
	await page.evaluate((selector) => {
		const frame = document.querySelector<HTMLIFrameElement>("iframe")
		const controls = [...(frame?.contentDocument?.querySelectorAll(selector) ?? [])].filter(
			(element) => element.getClientRects().length > 0,
		)
		// The frame's elements belong to the frame's realm, so the parent's `instanceof` cannot see them;
		// focus the last one by its own method.
		;(controls.at(-1) as HTMLElement | undefined)?.focus()
	}, FOCUSABLE)
	await page.keyboard.press("Tab")
	if (!(await page.evaluate(() => document.activeElement instanceof HTMLIFrameElement))) return true
	// Count the frame's controls once the loop starts: each one can need a press of its own before the
	// keyboard reaches the frame's end, plus the press that leaves it.
	const frameStops = await page.evaluate((selector) => {
		const frame = document.querySelector<HTMLIFrameElement>("iframe")
		const elements = [...(frame?.contentDocument?.querySelectorAll(selector) ?? [])]
		return elements.filter((element) => element.getClientRects().length > 0).length
	}, FOCUSABLE)
	for (let press = 0; press <= frameStops; press++) {
		await page.keyboard.press("Tab")
		if (!(await page.evaluate(() => document.activeElement instanceof HTMLIFrameElement)))
			return true
	}
	return false
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
