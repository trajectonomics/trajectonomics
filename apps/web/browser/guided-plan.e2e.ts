import { expect, type Page, test } from "@playwright/test"
import { BASE_URL, HOSTED_ORIGIN, HOSTED_PREFIX, SCRATCH_ORIGIN } from "./base-url"
import { SCREENSHOTS } from "./demo"
import { measureOverflow } from "./fit"

// The guided first plan at /plans/new/ (web ADR 0031): the three steps at a phone and a desktop, with no horizontal
// scroll; the Demo saves nothing and says so; and on the scratch ledger one save makes the plan and opens Home.
const SHOTS = process.env["TRAJ_WEB_GUIDED_SHOTS"] ?? `${SCREENSHOTS}/guided`
const WIDTHS_PX = [360, 1280] as const
const HEIGHT_PX = 800
const STEPS = ["1-household", "2-money", "3-stop"] as const

/** Fails when the page scrolls sideways. */
async function expectNoSideScroll(page: Page): Promise<void> {
	const fit = await measureOverflow(page, true)
	expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
}

/** Fills the one empty account holder: no plan of the Demo or the scratch ledger is marked main, so none seeds one. */
async function fillHolder(page: Page): Promise<void> {
	await page.getByLabel("Name").first().fill("Me")
	await page.getByLabel("Born").first().fill("1990-06")
	await page.getByLabel("Life expectancy").first().fill("90")
}

/** Screenshots the step showing now, at the width the page was given. */
async function shot(page: Page, width: number, step: string, build: string): Promise<void> {
	await page.screenshot({ path: `${SHOTS}/${build}/${width}/${step}.png`, fullPage: true })
}

for (const width of WIDTHS_PX) {
	test(`the loopback Demo's guided steps fit ${width}px and save nothing`, async ({ page }) => {
		await page.setViewportSize({ width, height: HEIGHT_PX })
		await page.goto(`${BASE_URL}/plans/new/?demo=1`)
		await expect(page.getByRole("heading", { name: "New plan" })).toBeVisible()
		await expect(page.getByText("Saving is off here")).toBeVisible()
		await fillHolder(page)
		await expectNoSideScroll(page)
		await shot(page, width, STEPS[0], "demo")
		await page.getByRole("button", { name: "Next" }).click()
		await expectNoSideScroll(page)
		await shot(page, width, STEPS[1], "demo")
		await page.getByRole("button", { name: "Next" }).click()
		await page.getByLabel("Stop-work age").fill("60")
		await page.getByLabel("Plan name").fill("guided")
		await expectNoSideScroll(page)
		await shot(page, width, STEPS[2], "demo")
		await expect(page.getByRole("button", { name: "Save plan" })).toHaveCount(0)
	})

	test(`the hosted Demo's guided plan fits ${width}px and saves nothing`, async ({ page }) => {
		await page.setViewportSize({ width, height: HEIGHT_PX })
		await page.goto(`${HOSTED_ORIGIN}${HOSTED_PREFIX}/plans/new/`)
		await expect(page.getByRole("heading", { name: "New plan" })).toBeVisible()
		await expect(page.getByText("Saving is off here")).toBeVisible()
		await expect(page.getByRole("button", { name: "Save plan" })).toHaveCount(0)
		await expectNoSideScroll(page)
		await shot(page, width, STEPS[0], "hosted")
	})
}

test("the guided plan saves end to end on the scratch ledger", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: HEIGHT_PX })
	await page.goto(`${SCRATCH_ORIGIN}/plans/new/`)
	await expect(page.getByRole("heading", { name: "New plan" })).toBeVisible()
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	// The short path asks for the two totals when the ledger covers fewer than three whole months.
	const income = page.getByLabel("Income per month")
	if ((await income.count()) > 0) {
		await income.fill("50000")
		await page.getByLabel("Spending per month").fill("20000")
	}
	await page.getByRole("button", { name: "Next" }).click()
	await page.getByLabel("Stop-work age").fill("60")
	await page.getByLabel("Plan name").fill("guided-e2e")
	await page.getByRole("button", { name: "Save plan" }).click()
	await expect(page).toHaveURL(/scenario=guided-e2e/, { timeout: 90_000 })
	await page.goto(`${SCRATCH_ORIGIN}/plans/?scenario=guided-e2e`)
	await expect(page.getByText("guided-e2e").first()).toBeVisible()
	await expectNoSideScroll(page)
	await shot(page, 1280, "4-saved", "scratch")
})
