import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { homeOf, openPage } from "./pages"

/** The English home, which carries the hero headline. */
const HOME = homeOf("en")

test.describe("the hero headline, with motion allowed", () => {
	test.use({ reducedMotion: "no-preference" })

	test("cycles the phrases a script shows and holds the line the page ships", async ({ page }) => {
		await openPage(page, HOME)
		const headline = page.locator("[data-hero-headline]")
		await expect(headline).toHaveAttribute("data-hero-stepping", "")
		await expect(page.locator("[data-hero-headline] > span:visible")).toHaveText(
			dictionaryFor(HOME.language).heroHeading,
			{ timeout: 10_000 },
		)
	})
})

test.describe("the hero headline, when the visitor asks for less motion", () => {
	test.use({ reducedMotion: "reduce" })

	test("shows the line the page ships and never steps", async ({ page }) => {
		await openPage(page, HOME)
		await expect(page.locator("[data-hero-headline] > span:visible")).toHaveText(
			dictionaryFor(HOME.language).heroHeading,
		)
		await expect(page.locator("[data-hero-stepping]")).toHaveCount(0)
	})
})
