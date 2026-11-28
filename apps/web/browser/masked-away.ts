import { expect, type Page } from "@playwright/test"
import { incomeDrawer } from "./masked-focus"

// A focus that moves while the window is away (web #783): Chromium fires no second blur, so the field still shows its
// real value and its next focus selects nothing. The window's return blurs the field, so the mask comes back.
export async function maskedAmountFocusAway(page: Page): Promise<void> {
	const dialog = await incomeDrawer(page, "away")
	const amount = dialog.getByLabel("Amount per occurrence", { exact: true })
	await amount.fill("12")

	// The window loses focus mid-typing: the field stays the active element, and the digits stay shown.
	await page.evaluate(() => {
		document.activeElement?.dispatchEvent(new FocusEvent("blur"))
		window.dispatchEvent(new FocusEvent("blur"))
	})

	// Focus moves to Starts while the window is away, and the browser fires no blur for it. The capture listener
	// drops the blur this page would fire, because the page still holds focus here.
	await page.evaluate(() => {
		const stop = (event: Event) => event.stopImmediatePropagation()
		window.addEventListener("blur", stop, true)
		document.getElementById("flow-start")?.focus()
		window.removeEventListener("blur", stop, true)
		window.dispatchEvent(new FocusEvent("focus"))
	})

	// The field is not focused, so it shows the mask again, and its next focus selects the value.
	await expect(amount).toHaveValue("•••••")
	await amount.focus()
	await page.keyboard.type("3")
	await expect(amount).toHaveValue("3")
}
