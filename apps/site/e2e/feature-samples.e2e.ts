import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"
import { VIEWPORTS } from "./viewports"

// The Features samples follow ADR 0021: at the phone viewport they wrap, so nothing scrolls and nothing clips.
test.describe("the Features samples at the phone viewport", () => {
	test.use({ reducedMotion: "reduce" })

	test("wrap rather than scroll or clip", async ({ page }) => {
		await page.setViewportSize(VIEWPORTS.phone)
		await openPage(page, homeOf("en"))
		const parts = page.locator("[data-feature-sample] pre, [data-feature-sample] code")
		expect(await parts.count()).toBeGreaterThan(0)
		for (const part of await parts.all()) {
			const { clientWidth, scrollWidth } = await part.evaluate((element) => ({
				clientWidth: element.clientWidth,
				scrollWidth: element.scrollWidth,
			}))
			expect(scrollWidth, `a sample is ${scrollWidth} px inside ${clientWidth} px`).toBe(
				clientWidth,
			)
		}
	})
})
