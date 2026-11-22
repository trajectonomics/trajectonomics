import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { copiedLabel } from "./controls"
import { homeOf, openPage } from "./pages"
import { VIEWPORTS } from "./viewports"

for (const language of ["en", "th"] as const) {
	const home = homeOf(language)

	test.describe(`the install CTA on the ${home.name}`, () => {
		test("the closing section offers the prompt beside the CLI link", async ({ page }) => {
			await openPage(page, home)
			const back = page.locator("[data-closing-prompt]")
			await expect(back).toBeVisible()
			await expect(back).toHaveText(dictionaryFor(language).ctaPromptLink)
			await expect(page.locator("[data-closing] .window-exit")).toBeVisible()
		})

		for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
			test(`a copy leaves the hero's two controls where they were (${viewportName})`, async ({
				page,
			}) => {
				await page.setViewportSize(viewport)
				await openPage(page, home)
				const button = page.locator("[data-copy-prompt]")
				const exit = page.locator("[data-install-window] .window-exit")
				const before = { button: await button.boundingBox(), exit: await exit.boundingBox() }

				await button.click()
				await expect(button).toHaveText(copiedLabel(language))
				expect(await button.boundingBox()).toEqual(before.button)
				expect(await exit.boundingBox()).toEqual(before.exit)

				await expect(button).toHaveText(dictionaryFor(language).copy, { timeout: 10_000 })
				expect(await exit.boundingBox()).toEqual(before.exit)
			})
		}
	})
}
