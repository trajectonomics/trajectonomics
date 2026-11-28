import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"
import { VIEWPORTS } from "./viewports"

test.describe("the hero's height", () => {
	for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
		test(`puts the live window on the landing view and follows it straight with the next section (${viewportName})`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport)
			await openPage(page, homeOf("en"))
			const measured = await page.evaluate(() => {
				const hero = document.querySelector("[data-hero]")
				const window = document.querySelector("[data-live]")
				const next = document.querySelector("main > section:not([data-hero])")
				return {
					hero: Math.round(hero?.getBoundingClientRect().height ?? 0),
					window: Math.round(window?.getBoundingClientRect().top ?? 0),
					next: Math.round(next?.getBoundingClientRect().top ?? 0),
					inHero: hero !== null && window !== null && hero.contains(window),
					// The window belongs to the hero's section and to no other, so no separate section
					// holds the Demo.
					section: window?.closest("section") === hero,
				}
			})
			expect(measured.window, "the live window starts on the landing view").toBeLessThan(
				viewport.height,
			)
			expect(measured.inHero, "the live window sits inside the hero").toBe(true)
			expect(measured.section, "the hero's section is the window's only one").toBe(true)
			expect(
				measured.next - measured.hero,
				"the next section meets the hero with no gap",
			).toBeLessThan(100)
		})
	}
})

test("the hero's bar is the way out to the hosted Demo, and there is no second link under it", async ({
	page,
}) => {
	await openPage(page, homeOf("en"))
	const bar = page.locator("[data-live] .live-bar")
	await expect(bar.locator("a.live-open")).toHaveAttribute("href", "/demo/")
	await expect(page.locator(".hero-demo")).toHaveCount(0)
	// The live window is still what `#demo` names, so an old anchor lands on it.
	await expect(page.locator("#demo")).toHaveCount(1)
	const anchored = await page.evaluate(() => {
		const anchor = document.querySelector("#demo")
		const live = document.querySelector("[data-live]")
		return anchor !== null && live !== null && anchor.contains(live)
	})
	expect(anchored, "#demo wraps the live window").toBe(true)
})
