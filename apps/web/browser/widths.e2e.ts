import { expect, test } from "@playwright/test"
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
				await openDemo(page, path, theme)
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

// A scroll box around a table holds the screen-reader-only labels in its cells (#352). Only a phone shows it.
for (const path of PAGES) {
	test(`${pageName(path)} keeps screen-reader-only labels inside its tables at 360px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: WIDTHS_PX[0], height: HEIGHT_PX })
		await openDemo(page, path, "light")
		expect(await labelsEscaping(page)).toEqual([])
	})
}
