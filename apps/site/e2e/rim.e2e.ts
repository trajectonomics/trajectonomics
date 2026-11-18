import { expect, test } from "@playwright/test"
import { openPage, PAGES } from "./pages"
import { rimOverlap } from "./rim-copy"

/** The hero as a visitor first meets it: a desktop, and a phone whose copy wraps to the full width. */
const VIEWPORTS = [
	{ name: "desktop", width: 1280, height: 800 },
	{ name: "phone", width: 390, height: 844 },
] as const

/** The Language homes, which are the pages that carry the hero. */
const HOMES = PAGES.filter((underTest) => underTest.status === 200)

for (const viewport of VIEWPORTS) {
	test.describe(`the hero's rim on a ${viewport.name}`, () => {
		// Reduced motion settles the load-in at once, so the copy holds the box a visitor reads.
		test.use({ reducedMotion: "reduce" })

		for (const home of HOMES) {
			test(`leaves every line of the ${home.name}'s copy on clean ground`, async ({ page }) => {
				await page.setViewportSize({ width: viewport.width, height: viewport.height })
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
