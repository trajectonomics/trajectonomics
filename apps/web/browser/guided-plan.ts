import { expect, type Page } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { measureOverflow } from "./fit"

/** Fails when the page scrolls sideways. */
export async function expectNoSideScroll(page: Page): Promise<void> {
	const fit = await measureOverflow(page, true)
	expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
}

/** Fills the one empty account holder: no plan of the Demo or the scratch ledger is marked main. */
export async function fillHolder(page: Page): Promise<void> {
	await page.getByLabel("Name", { exact: true }).first().fill("Me")
	await page.getByLabel("Born", { exact: true }).first().fill("1990-06")
	await page.getByLabel("Life expectancy", { exact: true }).first().fill("90")
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

/**
 * Deletes a plan a test saved on the shared scratch ledger, through the Plans page. A plan left there is read again
 * by every later save in the shard, so each test that saves a plan removes it. A delete refused as another Edit
 * running is tried again while the server is busy with another test's save.
 */
export async function deleteScratchPlan(page: Page, name: string): Promise<void> {
	await page.goto(`${SCRATCH_ORIGIN}/plans/`)
	const dialog = page.getByRole("dialog")
	await expect(async () => {
		if (!(await dialog.isVisible())) {
			await page.getByLabel(`Actions for ${name}`).click({ timeout: 5_000 })
			await page.getByRole("button", { name: "Delete plan" }).click({ timeout: 5_000 })
		}
		await dialog.getByRole("button", { name: "Delete plan" }).click({ timeout: 5_000 })
		await expect(dialog).toBeHidden({ timeout: 60_000 })
	}).toPass({ timeout: 180_000, intervals: [2_000] })
	await expect(page.getByLabel(`Actions for ${name}`)).toHaveCount(0, { timeout: 30_000 })
}
