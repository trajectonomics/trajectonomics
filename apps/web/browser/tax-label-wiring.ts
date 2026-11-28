import { expect, type Page } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { SLOW } from "./shared-interest"

// The Tax labels form keeps a refusal at the Flow it names after the Flow select moves (web #761). The answer is the
// CLI's envelope for a refusal at one Flow's label, stated here so the check reads the form's own match on the sent
// Flow, not the server's. The new income takes an Owner, because the form sends no Edit for an ownerless one (web #766).
export async function taxLabelRefusalAtFlow(page: Page): Promise<void> {
	const plan = "labels-360"
	await page.setViewportSize({ width: 360, height: 800 })
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/income/?scenario=${plan}`)
	await settle(page, "light")

	// A new income in a taxed plan has no label, so the Tax labels form offers it after the save of it and its Owner.
	await page.getByRole("button", { name: "Add income", exact: true }).click()
	const dialog = page.getByRole("dialog")
	await dialog.getByLabel("Id", { exact: true }).fill("wired")
	await dialog.getByLabel("Owner", { exact: true }).selectOption("me")
	await dialog.getByLabel("Starts", { exact: true }).fill("2026-11-01")
	await dialog.getByLabel("Amount per occurrence", { exact: true }).fill("1000")
	await dialog.getByRole("button", { name: "Save", exact: true }).click()
	await expect(dialog).toBeHidden({ timeout: SLOW })
	await page.getByRole("link", { name: "Tax labels", exact: true }).click()
	await settle(page, "light")

	await page.route("**/edit", (route) =>
		route.fulfill({
			contentType: "application/json",
			body: JSON.stringify({
				ok: false,
				error: {
					code: "invalid_input",
					exitCode: 2,
					message: "the CLI's words",
					path: "document.flows.wired.label",
				},
			}),
		}),
	)
	const form = page.getByRole("form", { name: "Tax labels" })
	await form.getByLabel("Income Flow", { exact: true }).selectOption("wired")
	await form.getByLabel("Tax label", { exact: true }).selectOption("income.section40_1")
	await form.getByRole("button", { name: "Save the tax label" }).click()

	// The refusal names the Flow the save sent, and it lands at the label field.
	const label = form.getByLabel("Tax label", { exact: true })
	await expect(label).toHaveAttribute("aria-describedby", /tax-label-label-problem/)
	await expect(form.locator("#tax-label-label-problem")).toHaveText("the CLI's words", {
		timeout: SLOW,
	})

	// Moving the Flow select afterwards leaves the refusal where the save put it.
	await form.getByLabel("Income Flow", { exact: true }).selectOption("")
	await expect(label).toHaveAttribute("aria-describedby", /tax-label-label-problem/)
	await expect(form.locator("#tax-label-label-problem")).toHaveText("the CLI's words")
}
