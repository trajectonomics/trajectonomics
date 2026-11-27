import { expect, type Page, test } from "@playwright/test"
import { BASE_URL, HOSTED_ORIGIN, HOSTED_PREFIX } from "./base-url"
import { SCREENSHOTS } from "./demo"
import { expectNoSideScroll, fillHolder } from "./guided-plan"

// The guided first plan at /plans/new/ (web ADR 0031): the three steps at a phone and a desktop, with no horizontal
// scroll, on the loopback Demo and on the hosted one. One Save is checked in guided-save.e2e.ts.
const SHOTS = process.env["TRAJ_WEB_GUIDED_SHOTS"] ?? `${SCREENSHOTS}/guided`
const WIDTHS_PX = [360, 1280] as const
const HEIGHT_PX = 800
const STEPS = ["1-household", "2-money", "3-stop"] as const

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

	test(`the hosted Demo's guided plan walks all three steps at ${width}px and saves nothing`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: HEIGHT_PX })
		await page.goto(`${HOSTED_ORIGIN}${HOSTED_PREFIX}/plans/new/`)
		await expect(page.getByRole("heading", { name: "New plan" })).toBeVisible()
		await expect(page.getByText("Saving is off here")).toBeVisible()
		await fillHolder(page)
		await expectNoSideScroll(page)
		await shot(page, width, STEPS[0], "hosted")
		await page.getByRole("button", { name: "Next" }).click()
		await expect(page.getByRole("heading", { name: "Your money" })).toBeVisible()
		await expectNoSideScroll(page)
		await shot(page, width, STEPS[1], "hosted")
		await page.getByRole("button", { name: "Next" }).click()
		await page.getByLabel("Stop-work age").fill("60")
		await page.getByLabel("Plan name").fill("guided")
		await expectNoSideScroll(page)
		await shot(page, width, STEPS[2], "hosted")
		await expect(page.getByRole("button", { name: "Save plan" })).toHaveCount(0)
	})
}
