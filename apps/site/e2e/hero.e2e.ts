import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"

/** The first screen the hero owns: a desktop, and a phone whose browser chrome moves its viewport. */
const VIEWPORTS = [
	{ name: "desktop", width: 1280, height: 800 },
	{ name: "phone", width: 390, height: 844 },
] as const

test.describe("the hero's height", () => {
	for (const viewport of VIEWPORTS) {
		test(`fills a ${viewport.name} viewport and then some, so the next section lands below the fold`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height })
			await openPage(page, homeOf("en"))
			const measured = await page.evaluate(() => {
				const hero = document.querySelector("[data-hero]")
				const next = document.querySelector("main > section:not([data-hero])")
				return {
					hero: Math.round(hero?.getBoundingClientRect().height ?? 0),
					next: Math.round(next?.getBoundingClientRect().top ?? 0),
				}
			})
			expect(measured.hero, "the hero is taller than the viewport").toBeGreaterThan(viewport.height)
			expect(measured.next, "the section under the hero starts below the fold").toBeGreaterThan(
				viewport.height,
			)
		})
	}
})
