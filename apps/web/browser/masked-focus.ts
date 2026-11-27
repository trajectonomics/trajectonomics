import { expect, type Locator, type Page } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { SLOW } from "./shared-interest"

// How a masked amount takes its focus (web #783): a tab switch mid-typing keeps the digits typed before it, and a click
// after a keyboard focus moves the caret. The scratch plan is this check's own.

/** Leaves the page and comes back as a tab switch does: the field keeps focus, and the window blurs, then focuses. */
async function switchAwayAndBack(page: Page): Promise<void> {
	await page.evaluate(() => {
		const field = document.activeElement
		field?.dispatchEvent(new FocusEvent("blur"))
		window.dispatchEvent(new FocusEvent("blur"))
	})
	await page.evaluate(() => {
		const field = document.activeElement
		field?.dispatchEvent(new FocusEvent("focus"))
		window.dispatchEvent(new FocusEvent("focus"))
	})
}

/** Opens the Income drawer of the scratch plan with Hide amounts on, its Id and Starts filled. */
async function incomeDrawer(page: Page, id: string): Promise<Locator> {
	await page.setViewportSize({ width: 360, height: 800 })
	await chooseBeforeLoad(page, { theme: "light", hideAmounts: true })
	await page.goto(`${SCRATCH_ORIGIN}/income/?scenario=hidden-amount-360`)
	await settle(page, "light")
	await page.getByRole("button", { name: "Add income", exact: true }).click()
	const dialog = page.getByRole("dialog")
	await dialog.getByLabel("Id", { exact: true }).fill(id)
	await dialog.getByLabel("Starts", { exact: true }).fill("2026-11-01")
	return dialog
}

// A tab switch in the middle of typing keeps the digits typed before it.
export async function maskedAmountTabSwitch(page: Page): Promise<void> {
	const plan = "hidden-amount-360"
	const dialog = await incomeDrawer(page, "switched")
	const amount = dialog.getByLabel("Amount per occurrence", { exact: true })
	await amount.fill("12")
	await expect(amount).toHaveValue("12")

	// The window losing and regaining focus is no edit of the field: the digits stay while it is away, and typing
	// continues after them instead of replacing them.
	await switchAwayAndBack(page)
	await expect(amount).toHaveValue("12")
	await page.keyboard.type("345")
	await expect(amount).toHaveValue("12345")

	const sent = page.waitForRequest(
		(request) => request.method() === "POST" && request.url().includes("/edit"),
	)
	await dialog.getByRole("button", { name: "Save", exact: true }).click()
	const request = await sent
	const edit = request.postDataJSON() as { document: { flows: { id: string; amount: string }[] } }
	expect(edit.document.flows.find((flow) => flow.id === "switched")?.amount).toBe("12345")
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
	expect(stored?.find((flow) => flow.id === "switched")?.amount).toBe("12345.00")
	await expect(dialog).toBeHidden({ timeout: SLOW })
}

// A click after keyboard focus moves the caret, so typing appends instead of replacing the selected value.
export async function maskedAmountTabThenClick(page: Page): Promise<void> {
	const dialog = await incomeDrawer(page, "clicked")
	const amount = dialog.getByLabel("Amount per occurrence", { exact: true })
	await amount.fill("5000")

	// Tab away so the field masks, then Shift+Tab back: the keyboard focus selects the whole value.
	await amount.press("Tab")
	await expect(amount).toHaveValue("•••••")
	await page.keyboard.press("Shift+Tab")
	await expect(amount).toHaveValue("5000")

	// A click at the end of the value moves the caret there, so the digit typed next goes after it.
	const box = await amount.boundingBox()
	if (box === null) throw new Error("the amount field is on screen")
	await amount.click({ position: { x: box.width - 8, y: box.height / 2 } })
	await page.keyboard.type("0")
	await expect(amount).toHaveValue("50000")
}
