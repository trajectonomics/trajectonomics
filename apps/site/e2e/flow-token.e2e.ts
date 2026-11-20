import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"

/** The English home, whose flow carries one agent token down the step list (ADR 0019). */
const HOME = homeOf("en")

test.use({ reducedMotion: "no-preference" })

test.describe("the layer flow's agent token", () => {
	test("the agent's token rides to the row that is running, and stops there", async ({ page }) => {
		await openPage(page, HOME)
		const how = page.locator(".how")
		const token = page.locator(".how-step-token")
		await how.scrollIntoViewIfNeeded()
		const rowOf = async (index: number) => {
			const row = how.locator(".how-step").nth(index)
			const box = await row.boundingBox()
			return box === null ? Number.NaN : box.y
		}
		for (const [index, step] of ([0, 1, 2, 3] as const).entries()) {
			await expect(how).toHaveAttribute("data-step", String(index + 1), { timeout: 5_000 })
			// The ride is a 400 ms transition: read the token once it has arrived.
			await page.waitForTimeout(600)
			const box = await token.boundingBox()
			if (box === null) throw new Error("the token has no box")
			// The token's own row is the running one: its top is that row's top.
			expect(Math.abs(box.y - (await rowOf(index))), `step ${step + 1}`).toBeLessThanOrEqual(2)
		}
	})
})
