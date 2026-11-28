import { expect, type Page } from "@playwright/test"
import { incomeDrawer } from "./masked-focus"

// Undo at a masked amount (web #783): the browser puts the mask back into the field, and the field must show it again
// rather than the draft the mask hides. A paste that holds the mask is dropped too, and the caret stays where it was.

// The browser's undo of the amount typed last puts the mask back; the field shows the mask, and it keeps the amount.
export async function maskedAmountUndo(page: Page): Promise<void> {
	const dialog = await incomeDrawer(page, "undone")
	const amount = dialog.getByLabel("Amount per occurrence", { exact: true })
	await amount.fill("5000")
	await amount.press("Tab")
	await expect(amount).toHaveValue("•••••")
	await page.keyboard.press("Shift+Tab")
	await expect(amount).toHaveValue("5000")
	await page.keyboard.type("6000")
	await expect(amount).toHaveValue("6000")
	await amount.press("Tab")
	await expect(amount).toHaveValue("•••••")

	// The undo counts on the field edited last, even while another field has focus. It puts back the text the field
	// held before the retype, which is the mask.
	await dialog.getByLabel("Starts", { exact: true }).press("Control+z")
	await expect(amount).toHaveValue("•••••")
	await page.keyboard.press("Tab")
	await expect(amount).toHaveValue("•••••")

	// The draft the mask hides is still the amount typed, so focus shows it and the form saves it.
	await amount.focus()
	await expect(amount).toHaveValue("6000")
}

// A paste that holds the mask is dropped, and the caret stays where the paste was rather than jumping to the end.
export async function maskedAmountPasteMask(page: Page): Promise<void> {
	const dialog = await incomeDrawer(page, "pasted")
	const amount = dialog.getByLabel("Amount per occurrence", { exact: true })
	await amount.fill("12345")
	await amount.evaluate((input) => {
		;(input as HTMLInputElement).setSelectionRange(2, 2)
	})
	await page.keyboard.insertText("•••")
	await expect(amount).toHaveValue("12345")
	await page.keyboard.type("9")
	await expect(amount).toHaveValue("129345")
}
