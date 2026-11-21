import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"
import { VIEWPORTS } from "./viewports"

test.describe("the hero's height", () => {
	for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
		test(`puts the demo window on the landing view and follows it straight with the next section (${viewportName})`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport)
			await openPage(page, homeOf("en"))
			const measured = await page.evaluate(() => {
				const hero = document.querySelector("[data-hero]")
				const window = document.querySelector("[data-app]")
				const next = document.querySelector("main > section:not([data-hero])")
				return {
					hero: Math.round(hero?.getBoundingClientRect().height ?? 0),
					window: Math.round(window?.getBoundingClientRect().top ?? 0),
					next: Math.round(next?.getBoundingClientRect().top ?? 0),
				}
			})
			expect(measured.window, "the demo window starts on the landing view").toBeLessThan(
				viewport.height,
			)
			expect(
				measured.next - measured.hero,
				"the next section meets the hero with no gap",
			).toBeLessThan(100)
		})
	}
})
