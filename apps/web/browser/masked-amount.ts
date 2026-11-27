import { expect, type Page } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { SLOW } from "./shared-interest"

// With Hide amounts on a money field shows a mask until focus. Focusing it must select the whole value, so typing
// replaces it rather than appending behind the mask (web #761). The scratch plan is this check's own.
export async function maskedAmountEdit(page: Page): Promise<void> {
	const plan = "hidden-amount-360"
	await page.setViewportSize({ width: 360, height: 800 })
	await chooseBeforeLoad(page, { theme: "light", hideAmounts: true })
	await page.goto(`${SCRATCH_ORIGIN}/income/?scenario=${plan}`)
	await settle(page, "light")

	await page.getByRole("button", { name: "Add income", exact: true }).click()
	const dialog = page.getByRole("dialog")
	await dialog.getByLabel("Id", { exact: true }).fill("bonus")
	await dialog.getByLabel("Starts", { exact: true }).fill("2026-11-01")
	const amount = dialog.getByLabel("Amount per occurrence", { exact: true })

	// Hide amounts masks the field once it loses focus.
	await amount.fill("5000")
	await amount.press("Tab")
	await expect(amount).toHaveValue("•••••")

	// Focus selects the digits, so typing replaces them rather than appending to the value behind the mask.
	await page.keyboard.press("Shift+Tab")
	await expect(amount).toHaveValue("5000")
	await page.keyboard.type("6000")
	await expect(amount).toHaveValue("6000")

	// A click into the masked field selects the whole value too: the mouseup must not drop the selection focus made.
	await amount.press("Tab")
	await expect(amount).toHaveValue("•••••")
	await amount.click()
	expect(
		await amount.evaluate((input) => {
			const field = input as HTMLInputElement
			return field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0)
		}),
		"the selection a click into the masked field makes",
	).toBe("6000")

	const sent = page.waitForRequest(
		(request) => request.method() === "POST" && request.url().includes("/edit"),
	)
	await dialog.getByRole("button", { name: "Save", exact: true }).click()
	const request = await sent
	const edit = request.postDataJSON() as { document: { flows: { id: string; amount: string }[] } }
	expect(edit.document.flows.find((flow) => flow.id === "bonus")?.amount).toBe("6000")
	// The plan read again after the save states the amount the CLI stored.
	const answer = (await (await request.response())?.json()) as {
		ok: boolean
		snapshot: {
			reads: {
				documents: Record<string, { data: { scenario: { document: typeof edit.document } } }>
			}
		}
	}
	expect(answer.ok).toBe(true)
	const stored = answer.snapshot.reads.documents[plan]?.data.scenario.document.flows
	expect(stored?.find((flow) => flow.id === "bonus")?.amount).toBe("6000.00")
	await expect(dialog).toBeHidden({ timeout: SLOW })
}
