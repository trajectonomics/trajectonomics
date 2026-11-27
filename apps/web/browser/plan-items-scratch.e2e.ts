import { expect, type Page, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"

// The Plan's compact cards that write (#703): a loan's face keeps its What-if and Pay extra, and a try form
// starts from the session's values. The Demo has no write path, so these checks run on the scratch Dashboard.

/** Opens a page of the editable scratch Dashboard. */
async function openScratch(page: Page, path: string): Promise<void> {
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}${path}`)
	await settle(page, "light")
}

test("a loan's What if opens its terms, and Pay extra the payment's form", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openScratch(page, "/projection/?scenario=shared-1280&items=assets")

	const loanCard = page
		.locator('[role="tabpanel"] button[data-plan-item]', { hasText: /paid off/ })
		.first()
	await loanCard.click()
	const drawer = page.locator("dialog[open]")
	await expect(drawer).toBeVisible()

	await drawer.getByRole("button", { name: "What if…" }).click()
	await expect(drawer.locator('form[aria-label^="Edit loan"]')).toBeVisible()
	await expect(drawer.getByLabel("The money")).toBeVisible()

	await drawer.getByRole("button", { name: "Close the drawer" }).click()
	await expect(page.locator("dialog[open]")).toHaveCount(0)
	await loanCard.click()
	await drawer.getByRole("button", { name: /^Pay .+ extra$/ }).click()
	await expect(drawer.locator('form[aria-label^="Pay extra on"]')).toBeVisible()
})

test("the try form starts from the session's value after a first try", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openScratch(page, "/projection/?scenario=shared-1280&items=income")

	const salary = page
		.locator('[role="tabpanel"] button[data-plan-item]', { hasText: "Salary" })
		.first()
	await salary.click()
	const drawer = page.locator("dialog[open]")
	await drawer.getByRole("button", { name: "What if…" }).click()
	await drawer.getByLabel("Amount per occurrence").fill("123456.78")
	await drawer.getByRole("button", { name: "Try this value" }).click()
	await expect(page.locator("dialog[open]")).toHaveCount(0)

	await salary.click()
	await drawer.getByRole("button", { name: "What if…" }).click()
	await expect(drawer.getByLabel("Amount per occurrence")).toHaveValue("123456.78")
})
