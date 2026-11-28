import { expect, test } from "@playwright/test"
import { chooseBeforeLoad, openDemo, settle } from "./demo"
import { measureOverflow } from "./fit"

// What a plan assumes (web ADR 0032): Home's card opens the list on the Plan page, which a phone shows without a
// sideways scroll.
test("Home's card opens the list on the Plan page, which fits a 360px screen", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 780 })
	await openDemo(page, "/?scenario=base", { theme: "light" })
	const card = page.getByRole("region", { name: /^This plan assumes \d+$/ })
	await expect(card).toBeVisible()
	const home = await measureOverflow(page, true)
	expect(home.scrollWidth, "Home").toBeLessThanOrEqual(home.innerWidth)

	// The whole card is the link's target: a click on its middle, away from the title, follows it.
	await card.click()
	await expect(page).toHaveURL(/\/projection\/\?scenario=base&demo=1#assumed$/)
	const list = page.locator("section#assumed")
	const heading = list.getByRole("heading", { level: 2, name: "This plan assumes" })
	await expect(heading, "the list, scrolled to").toBeInViewport()
	await expect(list.getByRole("button")).toHaveCount(0)
	const header = await page.locator("header").first().boundingBox()
	const box = await heading.boundingBox()
	expect(box?.y, "below the sticky header").toBeGreaterThanOrEqual(
		(header?.y ?? 0) + (header?.height ?? 0),
	)
	const plan = await measureOverflow(page, true)
	expect(plan.scrollWidth, "the Plan page").toBeLessThanOrEqual(plan.innerWidth)
})

test("an address that names the list lands on it once the figures are drawn", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 780 })
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto("/projection/?scenario=base&demo=1#assumed")
	await settle(page, "light")
	await expect(page.locator("section#assumed")).toBeInViewport()
})
