// Hide amounts masks every money input (web #766): a value a script puts in a field that does not hold focus is masked
// again, and it shows only while the field holds focus.
import { expect, type Locator, type Page, test } from "@playwright/test"
import { AMOUNT_MASK } from "../src/lib/format/mask"
import { openScratch } from "./edit-answers"
import { skipMaskingCheck } from "./masking"

const PLAN = "shared-360"
const pressed = (page: Page, name: string | RegExp) => page.getByRole("button", { name }).first()

/** Types as a script does, into a field nothing focused, then reads the field blurred and focused. */
async function masks(field: Locator): Promise<void> {
	await expect(field).toBeVisible()
	await field.evaluate((input: HTMLInputElement) => {
		input.blur()
		input.value = "98765"
		input.dispatchEvent(new Event("input", { bubbles: true }))
	})
	await expect(field).toHaveValue(AMOUNT_MASK)
	await field.focus()
	await expect(field).toHaveValue("98765")
	await field.blur()
	await expect(field).toHaveValue(AMOUNT_MASK)
}

test("a routing step's amount is masked", async ({ page }) => {
	skipMaskingCheck()
	await openScratch(page, "/routing/", PLAN, true)
	await pressed(page, "Add a step").click()
	const dialog = page.getByRole("dialog")
	await dialog.getByLabel("How much", { exact: true }).selectOption("upTo")
	await masks(dialog.locator("#step-amount"))
})

test("the spending amount and its limits are masked", async ({ page }) => {
	skipMaskingCheck()
	await openScratch(page, "/optimize/withdrawals/", PLAN, true)
	await pressed(page, /^(Set how you spend|Change )/).click()
	const dialog = page.getByRole("dialog")
	const how = dialog.getByLabel("How you spend", { exact: true })
	await how.selectOption("level")
	await masks(dialog.locator("#spend-amount"))
	await how.selectOption("currentRate")
	await masks(dialog.locator("#spend-floor"))
	await masks(dialog.locator("#spend-ceiling"))
})

test("a tax profile's amount is masked", async ({ page }) => {
	skipMaskingCheck()
	await openScratch(page, "/settings/tax/", PLAN, true)
	await pressed(page, "Edit insurance").click()
	await masks(page.getByRole("dialog").locator('input[inputmode="decimal"]').first())
})

test("the allowance step and budget are masked", async ({ page }) => {
	skipMaskingCheck()
	await openScratch(page, "/optimize/allowances/", PLAN, true)
	await masks(page.locator("#allowance-step"))
	await masks(page.locator("#allowance-budget"))
})

test("a value being recorded is masked", async ({ page }) => {
	skipMaskingCheck()
	await openScratch(page, "/net-worth/", PLAN, true)
	await pressed(page, "Record today's values").click()
	await masks(page.locator('li input[id^="value-"]').first())
})
