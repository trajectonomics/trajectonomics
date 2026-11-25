import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { measureOverflow } from "./fit"

// The Demo's `separate` Scenario files separately (cli ADR-0075), so the Tax page has two Returns to switch between.
// These checks run at 360px, the phone width of #352: the switch works, and neither page scrolls sideways.

async function fits(page: Page): Promise<void> {
	const fit = await measureOverflow(page, true)
	expect(fit.tables, "tables outside a scroll box").toEqual([])
	expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
}

test("the Tax page switches between the two Returns of a separate filing at 360px", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await openDemo(page, "/tax/?scenario=separate", { theme: "light" })
	await expect(page.getByRole("group", { name: "Return" })).toBeVisible()
	await expect(page.getByRole("radio", { name: "You", exact: true })).toBeChecked()
	await expect(page.locator("main")).toContainText("th-2026-pit@me")
	await fits(page)
	// The radio is visually hidden; its label is the control a person clicks.
	await page
		.getByRole("group", { name: "Return" })
		.getByText("Your partner", { exact: true })
		.click()
	await expect(page.getByRole("radio", { name: "Your partner" })).toBeChecked()
	await expect(page.locator("main")).toContainText("th-2026-pit@partner,")
	// The headline names the Return on screen; the projection's notes still name both Levies.
	await expect(page.locator("main")).not.toContainText("th-2026-pit@me,")
	await fits(page)
})

test("the profile page names who claims each allowance, and fits at 360px", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await openDemo(page, "/settings/tax/?scenario=separate", { theme: "light" })
	await expect(page.getByText("Who claims each allowance")).toBeVisible()
	await expect(page.locator("main")).toContainText("Your partner")
	// The holder's column is the profile's flat claims; the partner's is their `returns` entry.
	const claims = page.locator("section[aria-labelledby='tax-claims-title']")
	const life = claims
		.getByRole("row")
		.filter({ has: page.getByRole("rowheader", { name: "Life insurance premiums", exact: true }) })
	await expect(life).toContainText("15,000 THB")
	await expect(life).toContainText("12,000 THB")
	await fits(page)
})
