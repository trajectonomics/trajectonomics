import { expect, type Page, test } from "@playwright/test"
import { serveBands } from "./chance-money"
import { TODAY_SHOWN } from "./chance-money-snapshot"
import { openDemo } from "./demo"
import { measureOverflow } from "./fit"
import { outlineStyle, tabTo } from "./shell"

/** The page's own horizontal fit, and the tables that stick out of it. */
async function overflowProblems(page: Page): Promise<string[]> {
	const fit = await measureOverflow(page, true)
	return [
		...(fit.scrollWidth > fit.innerWidth
			? [`the page is ${fit.scrollWidth}px wide in ${fit.innerWidth}px`]
			: []),
		...fit.tables,
	]
}

const WIDTHS = [360, 1280] as const

for (const width of WIDTHS) {
	test(`the Chance page switches the Bands by keyboard at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 })
		await serveBands(page)
		await openDemo(page, "/chance/?scenario=base", { theme: "light" })

		const group = page.getByRole("group", { name: "Show the Net worth Bands in" })
		const today = group.getByRole("radio", { name: "Today's money" })
		const future = group.getByRole("radio", { name: "Future money" })
		await expect(today).toBeChecked()
		const table = page.getByRole("table", { name: /Net worth Bands by roll-up end/ })
		const median = table.locator("tbody tr").first().locator("td").nth(1)
		await expect(median).toHaveText(TODAY_SHOWN)
		const fan = page.getByRole("img", { name: /Net worth Bands by year/ })
		const todayFan = await fan.textContent()
		await expect(fan).toHaveAccessibleName(/, Today's money$/)
		await expect(table).toHaveAccessibleName(/, Today's money$/)

		// The arrow keys move the choice, as they do in any radio group, and the visible option draws a ring.
		await tabTo(page, today)
		await expect(today).toBeFocused()
		const ring = today.locator("xpath=following-sibling::span")
		expect(await outlineStyle(ring), "the switch's focus ring").toBe("solid")
		await page.keyboard.press("ArrowRight")
		await expect(future).toBeChecked()
		await expect(median).not.toHaveText(TODAY_SHOWN)
		expect(await fan.textContent(), "the fan draws the other money").not.toBe(todayFan)
		await expect(fan).toHaveAccessibleName(/, Future money$/)
		await expect(table).toHaveAccessibleName(/, Future money$/)
		expect(await overflowProblems(page)).toEqual([])

		await page.keyboard.press("ArrowLeft")
		await expect(today).toBeChecked()
		await expect(median).toHaveText(TODAY_SHOWN)
		expect(await overflowProblems(page)).toEqual([])

		// Paper hides the switch, so a printed line names the money instead. Last: hiding the switch drops its focus.
		const printed = page.getByText("Bands in today's money", { exact: true })
		await expect(printed).toBeHidden()
		await page.emulateMedia({ media: "print" })
		await expect(printed).toBeVisible()
		await expect(group).toBeHidden()
	})

	test(`one future states each year's Inflation column at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 })
		await serveBands(page)
		await openDemo(page, "/chance/path/?scenario=base&index=0", { theme: "light" })
		await expect(page.getByRole("columnheader", { name: "Inflation" })).toBeVisible()
		await expect(page.getByRole("cell", { name: "2.50%", exact: true }).first()).toBeVisible()
		expect(await overflowProblems(page)).toEqual([])
	})
}

test("the Assumptions page states the plan's Inflation swing at 360px", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 900 })
	await serveBands(page)
	await openDemo(page, "/settings/assumptions/?scenario=base", { theme: "light" })
	await expect(page.getByText("Inflation swing: ±1.50% a year")).toBeVisible()
	expect(await overflowProblems(page)).toEqual([])
})
