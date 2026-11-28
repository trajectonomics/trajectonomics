import { readFileSync } from "node:fs"
import { expect, type Locator, type Page, test } from "@playwright/test"
import { BASE_URL } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { fillHolder } from "./guided-plan"

// With Hide amounts on, a guided amount shows the mask once it loses focus. Undo puts the mask back into the field,
// and its draft must keep the amount typed rather than take the mask as one (#845, from #796): the field shows the
// typed amount on focus and no amount problem appears. Both steps of the money page are checked, and nothing writes.
const DEMO = readFileSync(new URL("../public/demo/snapshot.json", import.meta.url), "utf8")

/** Fills the holder and walks to the money step with amounts hidden. */
async function moneyStep(page: Page, routeBefore?: (page: Page) => Promise<void>): Promise<void> {
	await page.setViewportSize({ width: 1280, height: 800 })
	if (routeBefore !== undefined) await routeBefore(page)
	await chooseBeforeLoad(page, { theme: "light", hideAmounts: true })
	await page.goto(`${BASE_URL}/plans/new/?demo=1`)
	await settle(page, "light")
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	await expect(page.getByRole("heading", { name: "Your money" })).toBeVisible()
}

/** Types over a masked amount, leaves it, undoes the retype elsewhere, and shows the draft the mask hid. */
async function undoAtMasked(page: Page, field: Locator): Promise<void> {
	await field.fill("5000")
	await field.press("Tab")
	await expect(field).toHaveValue("•••••")
	await page.keyboard.press("Shift+Tab")
	await expect(field).toHaveValue("5000")
	await page.keyboard.type("6000")
	await expect(field).toHaveValue("6000")
	await field.press("Tab")
	await expect(field).toHaveValue("•••••")
	// The undo counts the field edited last even while another has focus: it puts the mask back.
	await page.keyboard.press("Control+z")
	await expect(field).toHaveValue("•••••")
	// The mask is no amount: the draft is still the retyped one, so focus shows it and no problem appears at the field.
	await field.focus()
	await expect(field).toHaveValue("6000")
	await expect(field).not.toHaveAttribute("aria-invalid", "true")
}

test("Undo at a masked row amount keeps the amount typed", async ({ page }) => {
	await moneyStep(page)
	await undoAtMasked(page, page.locator('input[id^="guided-amount-"]').first())
})

test("Undo at a masked total keeps the total typed on the short path", async ({ page }) => {
	await moneyStep(page, async (one) => {
		const snapshot = JSON.parse(DEMO) as { reads: Record<string, unknown> }
		// No rates read is the short path: the ledger states too little to carry rows in.
		delete snapshot.reads["rates"]
		await one.route(/\/demo\/snapshot\.json$/, (route) => route.fulfill({ json: snapshot }))
	})
	await undoAtMasked(page, page.getByLabel("Income per month"))
})
