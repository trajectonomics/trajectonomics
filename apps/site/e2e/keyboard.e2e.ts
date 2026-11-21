import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { paintedColour } from "./colour"
import {
	COPY_PROMPT_TEXT,
	copiedLabel,
	copiedMessage,
	focusableCount,
	ringVisible,
	tabToCopyButton,
} from "./controls"
import { DEVICE_SCHEMES, expectShippedTheme, openPage, PAGES } from "./pages"

/** The homes, which carry the controls a keyboard visitor operates. */
const HOMES = PAGES.filter((underTest) => underTest.status === 200)

for (const scheme of DEVICE_SCHEMES) {
	for (const underTest of HOMES) {
		test.describe(`${underTest.name} on a ${scheme} device`, () => {
			test.use({ colorScheme: scheme })

			test("Tab reaches every control and each one paints its ring", async ({ page }) => {
				await openPage(page, underTest)
				await expectShippedTheme(page)
				const count = await focusableCount(page)
				expect(count).toBeGreaterThan(0)
				const visited: string[] = []
				for (let stop = 1; stop <= count; stop++) {
					await page.keyboard.press("Tab")
					// The ring colour transitions from currentColor, so read it once the page has settled.
					await page.waitForTimeout(200)
					const reached = await page.evaluate(() => {
						const focused = document.activeElement
						if (!(focused instanceof HTMLElement)) return "none"
						const href = focused.getAttribute("href") ?? ""
						// The accessible name, not the text: two Replays in two sections are two controls.
						const name = focused.getAttribute("aria-label") ?? focused.textContent ?? ""
						return `${focused.tagName}:${href}:${name.trim()}`
					})
					expect(reached, `Tab stop ${stop} is a control`).not.toBe("none")
					expect(visited, `Tab stop ${stop} is a control not reached yet`).not.toContain(reached)
					visited.push(reached)
					expect(await ringVisible(page), `Tab stop ${stop} paints its ring`).toBe(true)
				}
				expect(visited).toHaveLength(count)
			})

			test("the header menus open from the keyboard and close on Escape", async ({ page }) => {
				await openPage(page, underTest)
				await expectShippedTheme(page)
				const menu = page.locator("details[data-header-menu]").first()
				const summary = menu.locator("summary")
				const firstLink = menu.locator("a").first()
				// A closed disclosure keeps its panel out of the tab order, so no hidden link is reachable.
				await expect(firstLink).toBeHidden()
				await summary.focus()
				await page.keyboard.press("Enter")
				await expect(firstLink).toBeVisible()
				await page.keyboard.press("Tab")
				await page.keyboard.press("Escape")
				await expect(firstLink).toBeHidden()
				await expect(summary).toBeFocused()
			})

			test("Enter and Space copy the prompt and announce it in this Language", async ({ page }) => {
				await openPage(page, underTest)
				expect(await tabToCopyButton(page)).toBe(true)
				const status = page.locator("[data-copy-status]")
				await expect(status).toHaveAttribute("role", "status")
				await expect(status).toHaveAttribute("aria-live", "polite")

				await page.keyboard.press("Enter")
				await expect(status).toHaveText(copiedMessage(underTest.language))
				expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(COPY_PROMPT_TEXT)

				await page.evaluate(() => navigator.clipboard.writeText(""))
				await page.keyboard.press("Space")
				await expect(status).toHaveText(copiedMessage(underTest.language))
				expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(COPY_PROMPT_TEXT)
			})

			test("the Copy button confirms in the accent role, and reverts with the notice", async ({
				page,
			}) => {
				await openPage(page, underTest)
				const button = page.locator("[data-copy-prompt]")
				const accent = await paintedColour(page, "--ds-color-accent")
				await expect(button).toHaveText(dictionaryFor(underTest.language).copy)

				await button.click()
				await expect(button).toHaveText(copiedLabel(underTest.language))
				await expect(button).toHaveCSS("background-color", accent)

				// Hovering neither paints another colour nor restarts the six seconds.
				await button.hover()
				await expect(button).toHaveCSS("background-color", accent)
				await expect(button).toHaveText(copiedLabel(underTest.language))

				await expect(button).toHaveText(dictionaryFor(underTest.language).copy, {
					timeout: 10_000,
				})
				expect(await button.evaluate((element) => element.hasAttribute("data-copy-state"))).toBe(
					false,
				)
			})
		})
	}
}
