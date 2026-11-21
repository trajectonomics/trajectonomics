import { expect, test } from "@playwright/test"
import { openPage, PAGES } from "./pages"
import { rimOverlap } from "./rim-copy"
import { VIEWPORTS } from "./viewports"

/** The Language homes, which are the pages that carry the hero. */
const HOMES = PAGES.filter((underTest) => underTest.status === 200)

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
	test.describe(`the hero's rim on a ${viewportName}`, () => {
		// Reduced motion settles the load-in at once, so the copy holds the box a visitor reads.
		test.use({ reducedMotion: "reduce" })

		for (const home of HOMES) {
			test(`leaves every line of the ${home.name}'s copy on clean ground`, async ({ page }) => {
				await page.setViewportSize(viewport)
				await openPage(page, home)
				const overlap = await rimOverlap(page)
				expect(overlap.samples, "the copy has line boxes to judge").toBeGreaterThan(0)
				expect(
					overlap.painted,
					`${overlap.text} carries the rim: worst channel delta ${overlap.worst}`,
				).toBe(0)
			})
		}
	})
}
