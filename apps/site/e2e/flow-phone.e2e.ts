import { expect, test } from "@playwright/test"
import { expectPulseInLogicLayer, homeOf, openPage } from "./pages"

/** The English home, whose flow is the section a phone reads first (ADR 0019). */
const HOME = homeOf("en")

test.describe("the layer flow on a phone", () => {
	test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" })

	test("puts the diagram above the steps, and sticks the running step to the bottom edge", async ({
		page,
	}) => {
		await openPage(page, HOME)
		const how = page.locator(".how")
		const layers = how.locator(".layers")
		const steps = how.locator(".how-steps")
		await steps.scrollIntoViewIfNeeded()
		const diagram = await layers.boundingBox()
		const list = await steps.boundingBox()
		if (diagram === null || list === null) throw new Error("the flow has no box")
		expect(diagram.y).toBeLessThan(list.y)
		await expect(how).toHaveAttribute("data-step", /^[1-4]$/)
		// One card at the screen's edge, showing only the step that is running.
		const card = await steps.boundingBox()
		if (card === null) throw new Error("the running step has no card")
		expect(Math.abs(card.y + card.height - 844)).toBeLessThanOrEqual(2)
		await expect(how.locator(".how-step:visible")).toHaveCount(1)
	})

	test("lands the pulse in the logic layer at a phone's width too", async ({ page }) => {
		await openPage(page, HOME)
		const how = page.locator(".how")
		await how.scrollIntoViewIfNeeded()
		await expect(how).toHaveAttribute("data-step", "3", { timeout: 12_000 })
		await expectPulseInLogicLayer(page)
	})
})
