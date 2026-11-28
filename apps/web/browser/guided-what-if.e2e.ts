import { expect, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { fillHolder } from "./guided-plan"

// A Save that lands while a What-if on another plan holds the page (web ADR 0031): the plan is in the ledger, the
// switch is refused, and the page says it saved and opens it once the What-if is settled.

test("a plan saved under a What-if says it saved, and opens once the What-if is settled", async ({
	page,
}) => {
	test.setTimeout(120_000)
	await page.setViewportSize({ width: 1280, height: 800 })
	await page.goto(`${SCRATCH_ORIGIN}/projection/?scenario=shared-1280&items=income`)
	const salary = page
		.locator('[role="tabpanel"] button[data-plan-item]', { hasText: "Salary" })
		.first()
	await salary.click()
	const drawer = page.locator("dialog[open]")
	await drawer.getByRole("button", { name: "What if…" }).click()
	await drawer.getByLabel("Amount per occurrence").fill("123456.78")
	await drawer.getByRole("button", { name: "Try this value" }).click()
	await expect(page.locator("dialog[open]")).toHaveCount(0)
	await expect(page.getByRole("region", { name: "What-if session" })).toBeVisible()

	// The drawer's link walks to the guided steps without a load, so the What-if on shared-1280 is still pending.
	await page.getByRole("button", { name: /^Plan: .+\. Change plan$/ }).click()
	await page.getByRole("menuitem", { name: "New plan" }).click()
	await page.getByRole("dialog").getByRole("link", { name: "Set up step by step" }).click()
	await expect(page.getByRole("heading", { name: "New plan" })).toBeVisible()
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
	await page.getByLabel("Plan name", { exact: true }).fill("guided-whatif")

	// The scratch server runs one Edit at a time, and other tests' saves share it: a Save refused as another Edit
	// running is clicked again until the plan is saved, for as long as those saves can take under a shard's load.
	test.setTimeout(300_000)
	const sentence = page.getByText("Settle the What-if above, then open it.")
	const save = page.getByRole("button", { name: "Save plan" })
	await expect(async () => {
		if (await save.isVisible()) await save.click({ timeout: 5_000 })
		await expect(sentence).toBeVisible({ timeout: 30_000 })
	}).toPass({ timeout: 180_000, intervals: [2_000] })
	await expect(sentence).toBeFocused()
	await expect(page.getByRole("button", { name: "Save plan" })).toHaveCount(0)

	// Settle the What-if with Revert, then open the plan the sentence names.
	await page.getByRole("button", { name: "Revert", exact: true }).click()
	await expect(page.getByRole("region", { name: "What-if session" })).toHaveCount(0)
	await page.getByRole("button", { name: "Open guided-whatif" }).click()
	await expect(page).toHaveURL(/scenario=guided-whatif/, { timeout: 90_000 })
	await expect(page.getByRole("button", { name: /Plan: guided-whatif/ })).toBeVisible()
})
