import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"

/** The first screen the hero owns: a desktop, and a phone whose browser chrome moves its viewport. */
const VIEWPORTS = [
	{ name: "desktop", width: 1280, height: 800 },
	{ name: "phone", width: 390, height: 844 },
] as const

test.describe("the hero's height", () => {
	for (const viewport of VIEWPORTS) {
		test(`puts the comparison on the landing view and follows it straight with the next section (${viewport.name})`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height })
			await openPage(page, homeOf("en"))
			const measured = await page.evaluate(() => {
				const hero = document.querySelector("[data-hero]")
				const comparison = document.querySelector("[data-action-compare]")
				const next = document.querySelector("main > section:not([data-hero])")
				return {
					hero: Math.round(hero?.getBoundingClientRect().height ?? 0),
					comparison: Math.round(comparison?.getBoundingClientRect().top ?? 0),
					next: Math.round(next?.getBoundingClientRect().top ?? 0),
				}
			})
			expect(measured.comparison, "the comparison starts on the landing view").toBeLessThan(
				viewport.height,
			)
			expect(
				measured.next - measured.hero,
				"the next section meets the hero with no gap",
			).toBeLessThan(100)
		})
	}
})
