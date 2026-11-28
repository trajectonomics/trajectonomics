import { expect, test } from "@playwright/test"
import { HIDE_AMOUNTS_ENABLED } from "../src/lib/view/preferences"
import { openDemo, SCREENSHOTS, THEMES } from "./demo"
import { labelsEscaping, measureOverflow } from "./fit"
import { PAGES, pageName } from "./pages"

// Every page of the Demo at a phone (360px, #352) and at a desktop (1280px), in both themes: the page
// never scrolls sideways, and a table wider than the screen scrolls inside its own box. Each page is
// photographed whatever the result, so a person can look at what CI checked.
const WIDTHS_PX = [360, 1280] as const
const HEIGHT_PX = 800

for (const theme of THEMES) {
	for (const width of WIDTHS_PX) {
		for (const path of PAGES) {
			test(`${pageName(path)} fits a ${width}px screen in the ${theme} theme`, async ({ page }) => {
				await page.setViewportSize({ width, height: HEIGHT_PX })
				await openDemo(page, path, { theme })
				await page.screenshot({
					path: `${SCREENSHOTS}/screen/${width}/${theme}/${pageName(path)}.png`,
					fullPage: true,
				})
				const fit = await measureOverflow(page, true)
				expect(fit.tables, "tables outside a scroll box").toEqual([])
				expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
			})
		}
	}
}

// Opening every Details on Home must not widen a phone: a closed disclosure holds a long command, and a
// card without `min-w-0` stretched its grid column and the page (#672).
test("Home stays 360px wide with every Details open", async ({ page }) => {
	await page.setViewportSize({ width: WIDTHS_PX[0], height: HEIGHT_PX })
	// The long command is what widened the page, so the traj commands are on (#937).
	await page.addInitScript(() => localStorage.setItem("traj.showCommands", "1"))
	await openDemo(page, "/", { theme: "light" })
	const summaries = page.locator("details > summary")
	const count = await summaries.count()
	expect(count, "Details disclosures on Home").toBeGreaterThan(0)
	for (let index = 0; index < count; index++) {
		await summaries.nth(index).click()
		const fit = await measureOverflow(page, true)
		expect(
			fit.scrollWidth,
			`the page's scroll width with Details ${index + 1} of ${count} open`,
		).toBeLessThanOrEqual(fit.innerWidth)
	}
})

// A scroll box around a table holds the screen-reader-only labels in its cells (#352). Only a phone shows it.
// Hiding amounts masks each figure with a label that is for a screen reader, so the second pass runs the
// pages' own labels as well as the synthetic one, while that feature is on (#927).
for (const hideAmounts of HIDE_AMOUNTS_ENABLED ? [false, true] : [false]) {
	for (const path of PAGES) {
		const state = hideAmounts ? ", with amounts hidden" : ""
		test(`${pageName(path)} keeps screen-reader-only labels inside its tables at 360px${state}`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: WIDTHS_PX[0], height: HEIGHT_PX })
			await openDemo(page, path, { theme: "light", hideAmounts })
			expect(await labelsEscaping(page)).toEqual([])
			if (hideAmounts) {
				const fit = await measureOverflow(page, true)
				expect(fit.tables, "tables outside a scroll box").toEqual([])
				expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
			}
		})
	}
}
