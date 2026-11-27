import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { SEEDED_CHART, seedChart } from "./hosted-controls"

// The Plan's chart controls (#702): the picker stays open while a chart is picked, and the Charts button
// takes focus back when the chart it shows is saved or deleted, so a keyboard never lands on the body.

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

test("ArrowDown in the picker picks a chart and keeps the panel open", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await seedChart(page)
	await openDemo(page, "/projection/?scenario=base", { theme: "light" })

	const button = page.getByRole("button", { name: "Charts", exact: true })
	await button.click()
	const picker = page.getByRole("combobox", { name: "Chart" })
	await picker.focus()
	await page.keyboard.press("ArrowDown")

	await expect(picker).toHaveValue(SEEDED_CHART)
	await expect(button).toHaveAttribute("aria-expanded", "true")
	await expect(picker).toBeVisible()
	await expect(page.getByRole("heading", { name: "Spend", level: 2 })).toBeVisible()
})

test("a chart saved or deleted gives the Charts button its focus back", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/projection/?scenario=base", { theme: "light" })

	const button = page.getByRole("button", { name: "Charts", exact: true })
	await button.click()
	await page.getByRole("combobox", { name: "Chart" }).selectOption("__new")
	const dialog = page.getByRole("dialog", { name: "New chart" })
	await expect(dialog).toBeVisible()
	await dialog.getByRole("checkbox", { name: "Net worth at the close of the year" }).check()
	await dialog.getByRole("button", { name: "Create chart" }).click()

	await expect(dialog).toBeHidden()
	await expect(
		page.getByRole("heading", { name: "Net worth at the close of the year", level: 2 }),
	).toBeVisible()
	await expect(button).toBeFocused()

	// The button opens its panel on the chart just made, so the branch swap kept it on the page.
	await button.click()
	await expect(page.getByRole("combobox", { name: "Chart" })).not.toHaveValue("")
	await page.keyboard.press("Escape")
	await expect(button).toHaveAttribute("aria-expanded", "false")
	const own = page.getByRole("group", { name: "This chart" })
	await own.getByRole("button", { name: "Delete" }).click()
	await own.getByRole("button", { name: "Delete" }).click()
	await expect(page.getByRole("heading", { name: "Net worth by year", level: 2 })).toBeVisible()
	await expect(button).toBeFocused()
})
