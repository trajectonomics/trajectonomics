import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"

// The Plan opens on its chart (#702): its top edge is in the first screen, the x axis says the holder's
// age, and the household cards and the year table live on their own pages.
test("the Plan opens on its chart within the first 400px at 1280px", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/projection/?scenario=base", { theme: "light" })

	const chart = page.getByRole("img", { name: "Net worth at the close of each year" })
	await expect(chart).toBeVisible()
	const box = await chart.boundingBox()
	expect(box, "the chart is laid out").not.toBeNull()
	expect(box?.y ?? Number.POSITIVE_INFINITY, "the chart's top edge").toBeLessThanOrEqual(400)

	// The CLI's first age names the first x tick, with the year under it.
	await expect(page.locator("svg text").filter({ hasText: "You 37" })).toHaveCount(1)
	await expect(page.locator("svg text").filter({ hasText: "2027" }).first()).toBeVisible()

	// Neither the household card nor the year table is on the Plan.
	await expect(page.getByText("Pin a date")).toHaveCount(0)
	await expect(page.getByRole("columnheader", { name: "Opening net worth" })).toHaveCount(0)
})

test("the Charts button opens the picker, and Escape shuts it", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/projection/?scenario=base", { theme: "light" })

	const button = page.getByRole("button", { name: "Charts", exact: true })
	await expect(button).toHaveAttribute("aria-expanded", "false")
	await button.click()
	await expect(button).toHaveAttribute("aria-expanded", "true")
	await expect(page.getByRole("combobox", { name: "Chart" })).toBeVisible()
	await expect(page.getByText("Import charts")).toBeVisible()

	await page.keyboard.press("Escape")
	await expect(page.getByRole("combobox", { name: "Chart" })).toHaveCount(0)
	await expect(button).toBeFocused()
})

test("the household and the year table render on their own pages", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/household/?scenario=base", { theme: "light" })
	await expect(page.getByRole("heading", { name: "Household", level: 1 })).toBeVisible()
	await expect(page.getByText("Account holder")).toBeVisible()

	await openDemo(page, "/projection/years/?scenario=base", { theme: "light" })
	await expect(page.getByRole("heading", { name: "Year by year", level: 1 })).toBeVisible()
	await expect(page.getByRole("columnheader", { name: "Opening net worth" })).toBeVisible()
	await expect(page.getByText("Pin a date")).toHaveCount(0)
})
