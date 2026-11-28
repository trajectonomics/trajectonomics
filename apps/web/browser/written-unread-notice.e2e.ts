import { expect, type Locator, type Page, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { PLAN } from "./routing-rows"

// The notice of a write that landed while the read after it failed (#830), at 360px on the scratch Dashboard. Every
// /edit and /reread is answered here and none reaches the server, so these checks write nothing (#851).

/** The sentence a write that landed while its read failed says. It is `WRITTEN_REREAD_FAILED_MESSAGE`. */
const SENTENCE = "Your change was saved, but the page could not show it. Reload to see it."
const BUSY = "The ledger is busy."

/** A server on which every write lands unread and every reread finds the ledger busy; counts the writes sent. */
async function landWrites(page: Page): Promise<{ edits: number }> {
	const sent = { edits: 0 }
	await page.route("**/edit", async (route) => {
		sent.edits += 1
		const error = { code: "written_reread_failed", exitCode: 1, message: SENTENCE }
		await route.fulfill({ json: { ok: false, error } })
	})
	await page.route("**/reread", async (route) => {
		const error = { code: "database_busy", exitCode: 3, message: BUSY }
		await route.fulfill({ json: { ok: false, error } })
	})
	return sent
}

async function open(page: Page, path: string): Promise<Locator> {
	await page.setViewportSize({ width: 360, height: 800 })
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}${path}?scenario=${PLAN}`)
	await settle(page, "light")
	return page.locator("main").getByRole("alert").filter({ hasText: SENTENCE })
}

/** Asks to remove the withdrawal entry shown at `place`, and confirms. */
async function removeEntry(page: Page, place: number): Promise<void> {
	const withdraw = page.locator('section[aria-labelledby="withdraw"]')
	await withdraw.getByRole("button", { name: `Remove… entry ${place}`, exact: true }).click()
	await withdraw.getByRole("button", { name: `Remove entry ${place}`, exact: true }).click()
}

test("a Reload that fails says why inside the notice and nowhere else, and keeps keyboard focus", async ({
	page,
}) => {
	await landWrites(page)
	const alert = await open(page, "/settings/assumptions/")
	await page.getByRole("button", { name: "Save", exact: true }).click()
	await expect(alert).toBeFocused()

	const reload = alert.getByRole("button", { name: "Reload" })
	await reload.focus()
	await page.keyboard.press("Enter")
	await expect(alert).toContainText(BUSY)
	await expect(reload).toBeFocused()
	await expect(page.getByText(BUSY)).toHaveCount(1)
})

test("a second write that lands unread puts focus on the notice again", async ({ page }) => {
	const sent = await landWrites(page)
	const alert = await open(page, "/routing/")
	await removeEntry(page, 1)
	await expect(alert).toBeFocused()

	await removeEntry(page, 2)
	await expect.poll(() => sent.edits).toBe(2)
	await expect(alert).toBeFocused()
})

test("a row removal that lands unread leaves the row no longer asking to remove", async ({
	page,
}) => {
	await landWrites(page)
	const alert = await open(page, "/routing/")
	await removeEntry(page, 1)
	await expect(alert).toBeFocused()

	const withdraw = page.locator('section[aria-labelledby="withdraw"]')
	await expect(withdraw.getByRole("button", { name: "Keep entry 1" })).toHaveCount(0)
	await expect(withdraw.getByRole("button", { name: "Remove… entry 1" })).toBeVisible()
})
