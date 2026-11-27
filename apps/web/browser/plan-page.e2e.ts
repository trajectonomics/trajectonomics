import { expect, test } from "@playwright/test"
import { openDemo, SCREENSHOTS } from "./demo"
import { measureStats } from "./plan-stats"

// The Plan opens on its chart (#702): its top edge is in the first screen at a phone and at a desktop,
// the x axis says the holder's age, and the household cards and the year table live on their own pages.

test("the Plan opens on its chart within the first 400px at 1280px", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/projection/?scenario=base", { theme: "light" })

	const chart = page.getByRole("img", { name: "Net worth at the close of each year" })
	await expect(chart).toBeVisible()
	expect(await chart.getAttribute("height"), "the chart from md up").toBe("320")
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

test("the Plan fits a phone: its chart is in the first screen, and so is the Charts panel", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 640 })
	await openDemo(page, "/projection/?scenario=base", { theme: "light" })

	const chart = page.getByRole("img", { name: "Net worth at the close of each year" })
	await expect(chart).toBeVisible()
	expect(await chart.getAttribute("height"), "the chart on a phone").toBe("220")
	const box = await chart.boundingBox()
	expect(box?.y ?? Number.POSITIVE_INFINITY, "the chart's top edge").toBeLessThanOrEqual(640)

	const stats = await measureStats(page)
	expect(stats.tops, "the three figures are laid out").not.toContain(-1)
	expect(new Set(stats.tops).size, "the three figures on one row").toBe(1)
	expect(
		stats.over.filter((over) => over > 1),
		"a figure wider than its cell",
	).toEqual([])

	const button = page.getByRole("button", { name: "Charts", exact: true })
	const heading = page.getByRole("heading", { name: "Net worth by year", level: 2 })
	const headingBox = await heading.boundingBox()
	const buttonBox = await button.boundingBox()
	expect(
		Math.abs((buttonBox?.y ?? 0) - (headingBox?.y ?? 0)),
		"the button on the title's row",
	).toBeLessThan(8)
	expect((buttonBox?.x ?? 0) + (buttonBox?.width ?? 0), "the button at the right").toBeGreaterThan(
		300,
	)

	await button.click()
	const panel = page.locator(`#${await button.getAttribute("aria-controls")}`)
	await expect(panel).toBeVisible()
	const panelBox = await panel.boundingBox()
	expect(panelBox?.x ?? -1, "the panel's left edge").toBeGreaterThanOrEqual(0)
	expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0), "the panel's right edge").toBeLessThanOrEqual(
		360,
	)
	await page.screenshot({
		path: `${SCREENSHOTS}/screen/360/light/projection-charts.png`,
		fullPage: true,
	})
})

test("the three figures stay in their cells with amounts hidden at 360px", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 640 })
	await openDemo(page, "/projection/?scenario=base", { theme: "light", hideAmounts: true })
	const stats = await measureStats(page)
	expect(stats.tops, "the three figures are laid out").not.toContain(-1)
	expect(
		stats.over.filter((over) => over > 1),
		"a figure wider than its cell",
	).toEqual([])
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
