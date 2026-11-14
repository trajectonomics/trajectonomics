import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { homeOf, openPage } from "./pages"

/** The English home, which carries the hero headline. */
const HOME = homeOf("en")

test.describe("the hero headline, with motion allowed", () => {
	test.use({ reducedMotion: "no-preference" })

	test("cycles the suffixes a script shows and holds the suffix the page ships", async ({
		page,
	}) => {
		await openPage(page, HOME)
		const stack = page.locator("[data-hero-stack]")
		await expect(stack).toHaveAttribute("data-hero-stepping", "")
		// While stepping every suffix is visibility:visible, so the shown one is the precise target.
		await expect(page.locator("[data-hero-stack] > span[data-hero-shown]")).toHaveText(
			dictionaryFor(HOME.language).heroHeadingCycle.at(-1) ?? "",
			{ timeout: 10_000 },
		)
	})
})

test.describe("the hero headline, when the visitor asks for less motion", () => {
	test.use({ reducedMotion: "reduce" })

	test("shows the suffix the page ships and never steps", async ({ page }) => {
		await openPage(page, HOME)
		await expect(page.locator("[data-hero-stack] > span:visible")).toHaveText(
			dictionaryFor(HOME.language).heroHeadingCycle.at(-1) ?? "",
		)
		await expect(page.locator("[data-hero-stepping]")).toHaveCount(0)
	})
})
