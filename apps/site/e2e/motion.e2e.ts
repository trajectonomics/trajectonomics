import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { homeOf, openPage } from "./pages"

/** The English home, which carries the hero headline. */
const HOME = homeOf("en")

/** Whether motion is allowed or not, the headline is one line that holds still (ADR 0012). */
for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test.describe(`the hero headline, with motion set to ${reducedMotion}`, () => {
		test.use({ reducedMotion })

		test("shows the whole headline at once and highlights only the accent", async ({ page }) => {
			await openPage(page, HOME)
			const dictionary = dictionaryFor(HOME.language)
			const h1 = page.locator("h1")
			await expect(h1).toHaveText(`${dictionary.heroHeadingPrefix} ${dictionary.heroHeadingAccent}`)
			await expect(page.locator("[data-hero-accent]")).toHaveText(dictionary.heroHeadingAccent)
			await expect(page.locator("[data-hero-accent]")).toBeVisible()
		})

		test("never steps through a list of suffixes", async ({ page }) => {
			await openPage(page, HOME)
			await page.waitForTimeout(3_000)
			await expect(page.locator("[data-hero-stack], [data-hero-stepping]")).toHaveCount(0)
			await expect(page.locator("h1")).toHaveText(
				`${dictionaryFor(HOME.language).heroHeadingPrefix} ${dictionaryFor(HOME.language).heroHeadingAccent}`,
			)
		})
	})
}
