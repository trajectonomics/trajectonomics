import { expect, test } from "@playwright/test"
import { openDemo, SCREENSHOTS } from "./demo"
import { measureOverflow } from "./fit"
import { skipMaskingCheck } from "./masking"

// The Plan's compact cards under their tabs (#703): each Milestone's link, Hide amounts on every tab, and the
// phone width of every tab.

test("a Milestone card links to its own row on the Milestones page", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/projection/?scenario=base&items=milestones", { theme: "light" })

	const link = page.locator('[role="tabpanel"] a[href*="#"]').first()
	const href = (await link.getAttribute("href")) ?? ""
	const id = href.split("#")[1] ?? ""
	expect(id, "the card names its row").not.toBe("")
	await link.click()
	await expect(page).toHaveURL(new RegExp(`#${id}$`))
	await expect(page.locator(`#${id}`)).toBeInViewport()
})

for (const items of ["income", "expenses", "assets", "milestones"]) {
	test(`Hide amounts masks every compact amount on the ${items} tab`, async ({ page }) => {
		skipMaskingCheck()
		await page.setViewportSize({ width: 1280, height: 800 })
		await openDemo(page, `/projection/?scenario=base&items=${items}`, {
			theme: "light",
			hideAmounts: true,
		})

		const amounts = page.locator('[role="tabpanel"] .tabular-nums > span[aria-hidden="true"]')
		await expect(amounts.first()).toBeVisible()
		const texts = await amounts.allInnerTexts()
		expect(texts.length, "a compact amount to mask").toBeGreaterThan(0)
		for (const text of texts) expect(text, "a masked amount").not.toMatch(/\d/)
		await expect(page.getByText("amount hidden").first()).toBeAttached()
	})
}

for (const items of ["income", "expenses", "assets", "milestones"]) {
	test(`the ${items} tab keeps a 360px phone from widening`, async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 800 })
		await openDemo(page, `/projection/?scenario=base&items=${items}`, { theme: "light" })
		const fit = await measureOverflow(page, true)
		expect(fit.tables, "tables outside a scroll box").toEqual([])
		expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
	})
}

test("the Expenses and Assets and debts tabs at 360px", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	for (const items of ["expenses", "assets"]) {
		await openDemo(page, `/projection/?scenario=base&items=${items}`, { theme: "light" })
		await page.screenshot({
			path: `${SCREENSHOTS}/plan-items/360-light-${items}.png`,
			fullPage: true,
		})
	}
})
