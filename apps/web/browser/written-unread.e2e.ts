import { expect, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"

// A write that lands while the Snapshot read after it fails (#750): the page does what it does after any save and
// says once, above the page, that the change was saved and Reload will show it. Both checks run at 360px on the
// scratch Dashboard, with the answer to /edit replaced by the landed one after the write itself really landed.

/** How long a save may take: the server really writes, and only its answer is replaced. */
const SLOW = 120_000

/** The sentence a write that landed while its read failed says. It is `WRITTEN_REREAD_FAILED_MESSAGE`. */
const SENTENCE = "Your change was saved, but the page could not show it. Reload to see it."

// Each save waits up to SLOW, so the whole test needs more than Playwright's 30 s default.
test.describe.configure({ mode: "serial", timeout: 3 * SLOW / 2 })

/** Lets every /edit reach the server, then answers as a write that landed while the read after it failed. */
async function landWrites(page: import("@playwright/test").Page): Promise<void> {
	await page.route("**/edit", async (route) => {
		await route.fetch()
		await route.fulfill({
			json: {
				ok: false,
				error: { code: "written_reread_failed", exitCode: 1, message: SENTENCE },
			},
		})
	})
}

test("a notes save that lands unread closes its drawer, focuses the page's sentence, and Reload shows the note", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await landWrites(page)
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/plans/?scenario=landed-notes-360`)
	await settle(page, "light")

	await page.locator('summary[aria-label="Actions for landed-notes-360"]').click()
	await page.getByRole("button", { name: "Notes", exact: true }).click()
	const dialog = page.getByRole("dialog")
	await dialog.getByLabel("What landed-notes-360 assumes").fill("Checked at 360.")
	await dialog.getByRole("button", { name: "Save notes" }).click()
	await expect(dialog).toBeHidden({ timeout: SLOW })

	const alert = page.locator("main").getByRole("alert").filter({ hasText: SENTENCE })
	await expect(alert).toBeVisible({ timeout: SLOW })
	await expect(alert).toBeFocused()

	await alert.getByRole("button", { name: "Reload" }).click()
	await expect(alert).toBeHidden({ timeout: SLOW })
	await expect(page.getByText("Checked at 360.")).toBeVisible()
})

test("a routing reorder that lands unread hides 'not saved yet', and Reload shows the stored order", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await landWrites(page)
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/routing/?scenario=landed-order-360`)
	await settle(page, "light")

	const withdraw = page.locator('section[aria-labelledby="withdraw"]')
	await withdraw.getByRole("button", { name: /move Take from Bank down/ }).click()
	await withdraw.getByRole("button", { name: "Done" }).click()
	await expect(withdraw.getByText("The new order is not saved yet.")).toBeHidden({ timeout: SLOW })

	const alert = page.locator("main").getByRole("alert").filter({ hasText: SENTENCE })
	await expect(alert).toBeVisible({ timeout: SLOW })
	await expect(alert).toBeFocused()

	await alert.getByRole("button", { name: "Reload" }).click()
	await expect(alert).toBeHidden({ timeout: SLOW })
	await expect(withdraw.getByRole("listitem").first()).toContainText("Take from Fund")
})
