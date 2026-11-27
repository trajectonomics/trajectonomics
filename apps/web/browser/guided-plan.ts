import { expect, type Page } from "@playwright/test"
import { measureOverflow } from "./fit"

/** Fails when the page scrolls sideways. */
export async function expectNoSideScroll(page: Page): Promise<void> {
	const fit = await measureOverflow(page, true)
	expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
}

/** Fills the one empty account holder: no plan of the Demo or the scratch ledger is marked main. */
export async function fillHolder(page: Page): Promise<void> {
	await page.getByLabel("Name").first().fill("Me")
	await page.getByLabel("Born").first().fill("1990-06")
	await page.getByLabel("Life expectancy").first().fill("90")
}

/** Walks from a filled holder to the stop step, filling the two totals when the short path asks for them. */
export async function walkSteps(page: Page, name: string): Promise<void> {
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	await expect(page.getByRole("heading", { name: "Your money" })).toBeVisible()
	const income = page.getByLabel("Income per month")
	if ((await income.count()) > 0) {
		await income.fill("50000")
		await page.getByLabel("Spending per month").fill("20000")
	}
	await page.getByRole("button", { name: "Next" }).click()
	await page.getByLabel("Stop-work age").fill("60")
	await page.getByLabel("Plan name").fill(name)
}
