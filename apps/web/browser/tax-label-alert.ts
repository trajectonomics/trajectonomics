import { expect, type Page } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { SLOW } from "./shared-interest"

// The `labels-360` plan is a separate filing whose Levies read Filer labels. A new income Flow has no tax label, and the
// Tax labels form writes a bare one, which the CLI refuses at the whole document. The refusal's alert takes focus once;
// moving the Flow select afterwards leaves the same message shown and focus where the person put it (web #761).
export async function taxLabelAlert(page: Page): Promise<void> {
	const plan = "labels-360"
	await page.setViewportSize({ width: 360, height: 800 })
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/income/?scenario=${plan}&terms=today`)
	await settle(page, "light")

	// A new income in a taxed plan has no tax label, so the Tax labels form offers it.
	await page.getByRole("button", { name: "Add income", exact: true }).click()
	const dialog = page.getByRole("dialog")
	await dialog.getByLabel("Id", { exact: true }).fill("side-gig")
	await dialog.getByLabel("Starts", { exact: true }).fill("2026-11-01")
	await dialog.getByLabel("Amount per occurrence", { exact: true }).fill("1000")
	await dialog.getByRole("button", { name: "Save", exact: true }).click()
	await expect(dialog).toBeHidden({ timeout: SLOW })

	// The page the drawer closes to offers the Tax labels page for the income just saved, its plan named once and
	// the rest of the page's query kept.
	// The sentence shows once as a paragraph; its screen-reader copy is the status region beside it.
	const sentence = "Give this income a label in Tax labels."
	await expect(page.getByRole("paragraph").filter({ hasText: sentence })).toBeVisible({
		timeout: SLOW,
	})
	await expect(page.getByRole("status").filter({ hasText: sentence })).toHaveCount(1)
	const link = page.getByRole("link", { name: "Tax labels", exact: true })
	await expect(link).toHaveAttribute("href", `/settings/tax/?scenario=${plan}&terms=today`)
	await link.click()
	await settle(page, "light")
	const form = page.getByRole("form", { name: "Tax labels" })
	await expect(form).toBeVisible()
	await form.getByLabel("Income Flow", { exact: true }).selectOption("side-gig")
	await form.getByLabel("Tax label", { exact: true }).selectOption("income.section40_1")
	await form.getByRole("button", { name: "Save the tax label" }).click()

	const alert = form.getByRole("alert")
	await expect(alert).toBeVisible({ timeout: SLOW })
	await expect(alert).toBeFocused()
	const words = await alert.textContent()

	// The refusal is shown again on every derivation of the form's state; the select keeps focus throughout.
	const select = form.getByLabel("Income Flow", { exact: true })
	await select.focus()
	await select.press("ArrowUp")
	expect(await select.inputValue(), "the select moved to its blank choice").toBe("")
	await expect(select).toBeFocused()
	await expect(alert).toHaveText(words ?? "")
}
