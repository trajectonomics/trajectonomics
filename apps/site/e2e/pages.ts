import { expect, type Page } from "@playwright/test"
import { PRODUCTION_THEME } from "../src/lib/design/shipped-themes"
import type { Language } from "../src/lib/language/language"
import { dictionaryFor } from "../src/lib/language/languages"
import { INSTALL_PROMPT } from "../src/lib/site"

/** One page the browser checks judge, and the status its real response must have. */
export interface PageUnderTest {
	readonly path: string
	readonly language: Language
	readonly name: string
	readonly status: number
}

/** The Language homes and the real Not-found response every browser check judges. */
export const PAGES: readonly PageUnderTest[] = Object.freeze([
	{ path: "/th/", language: "th", name: "Thai home", status: 200 },
	{ path: "/en/", language: "en", name: "English home", status: 200 },
	{ path: "/no-such-path/", language: "en", name: "Not-found page", status: 404 },
])

/** The controls a keyboard visitor can reach, excluding anything hidden or disabled. */
const FOCUSABLE = "a[href], button:not([disabled]):not([hidden]), summary"

/**
 * The device schemes the harness sets before navigation. Both are kept although the Site ships one
 * Theme: a leftover device query in a component's own styles is what this catches ([ADR 0016]).
 */
export const DEVICE_SCHEMES = Object.freeze(["light", "dark"] as const)

/** The Language home of one Language, which every browser check judges. */
export function homeOf(language: Language): PageUnderTest {
	const home = PAGES.find(
		(underTest) => underTest.language === language && underTest.status === 200,
	)
	if (home === undefined) throw new Error(`the Site has no ${language} home`)
	return home
}

/** Open a page, assert its real status and the Language its document declares. */
export async function openPage(page: Page, underTest: PageUnderTest): Promise<void> {
	const response = await page.goto(underTest.path)
	expect(response?.status(), `${underTest.path} answers ${underTest.status}`).toBe(underTest.status)
	await expect(page.locator("html")).toHaveAttribute("lang", new RegExp(`^${underTest.language}`))
}

/** Assert the page painted the Theme a production build ships, whatever the device asked for. */
export async function expectShippedTheme(page: Page): Promise<void> {
	await expect(page.locator("html")).toHaveAttribute("data-theme", PRODUCTION_THEME)
}

/** The number of controls a keyboard visitor can reach on the page. */
export function focusableCount(page: Page): Promise<number> {
	return page.evaluate(
		(selector) =>
			// A closed <details> keeps its panel laid out but out of the tab order, so only the
			// summary and the controls outside every closed panel are counted.
			[...document.querySelectorAll(selector)].filter((element) => {
				const panel = element.closest("details:not([open])")
				return panel === null || element.tagName === "SUMMARY"
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
