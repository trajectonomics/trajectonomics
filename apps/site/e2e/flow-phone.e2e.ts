import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { expectPulseInLogicLayer, homeOf, openPage } from "./pages"

/** The English home, whose flow a phone reads as the diagram alone, with no step list. */
const HOME = homeOf("en")
const dictionary = dictionaryFor(HOME.language)

test.describe("the layer flow on a phone", () => {
	test.use({ reducedMotion: "no-preference" })

	for (const width of [375, 390]) {
		test(`${width}px: shows the diagram alone, and chips the actor of the step that runs`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 844 })
			await openPage(page, HOME)
			const how = page.locator(".how")
			const layers = how.locator(".layers")
			await layers.scrollIntoViewIfNeeded()
			// The four steps leave the layout, so the diagram is the whole section.
			const steps = await how.locator(".how-steps").boundingBox()
			if (steps === null) throw new Error("the step list has no box")
			expect(Math.max(steps.width, steps.height)).toBeLessThanOrEqual(1)
			await expect(layers).toBeVisible()

			await expect(how).toHaveAttribute("data-step", "3", { timeout: 12_000 })
			const chip = how.locator('[data-step-chip="3"]')
			await expect(chip).toHaveCSS("opacity", "1")
			// It names the actor, in the Glossary's words, and it is drawn inside the phone's width.
			await expect(chip).toContainText(dictionary.howStepActors[2] ?? "")
			const box = await chip.boundingBox()
			if (box === null) throw new Error("the running chip has no box")
			expect(box.x).toBeGreaterThanOrEqual(0)
			expect(box.x + box.width).toBeLessThanOrEqual(width)
			// Legible at arm's length: the desktop's 10 px label is a hairline on a phone.
			expect(
				await chip.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
			).toBeGreaterThanOrEqual(11)
		})
	}

	test("lands the pulse in the logic layer at a phone's width too", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 })
		await openPage(page, HOME)
		const how = page.locator(".how")
		await how.scrollIntoViewIfNeeded()
		await expect(how).toHaveAttribute("data-step", "3", { timeout: 12_000 })
		await expectPulseInLogicLayer(page)
	})
})
