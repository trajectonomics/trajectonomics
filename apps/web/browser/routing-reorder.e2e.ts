import { expect, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"

// A routing row's buttons act on the item the row shows (#829). The Demo has no write path, so the check runs on the
// scratch Dashboard, whose own `row-order-360` plan takes from Bank and then from Fund: it removes a step, so it keeps
// a plan of its own, never one another check writes.

/** How long a save may take: the server really writes the scratch ledger. */
const SLOW = 120_000

test.describe.configure({ mode: "serial", timeout: (3 * SLOW) / 2 })

test("removing the first row of an order that is not saved yet removes that row's step, not the step at its place", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/routing/?scenario=row-order-360`)
	await settle(page, "light")

	const withdraw = page.locator('section[aria-labelledby="withdraw"]')
	// Move Bank down without saving, so Fund is the row first on screen and Bank is still first in the saved list.
	await withdraw.getByRole("button", { name: /move Take from Bank down/ }).click()
	await expect(withdraw.getByText("The new order is not saved yet.")).toBeVisible()
	const first = withdraw.getByRole("listitem").first()
	await expect(first).toContainText("Take from Fund")

	await first.getByRole("button", { name: /^Remove…/ }).click()
	await first.getByRole("button", { name: /^Remove entry/ }).click()
	await expect(withdraw.getByText("The new order is not saved yet.")).toBeHidden({ timeout: SLOW })

	await page.reload()
	await settle(page, "light")
	const saved = page.locator('section[aria-labelledby="withdraw"]')
	await expect(saved.getByRole("listitem")).toHaveCount(1)
	await expect(saved.getByRole("listitem").first()).toContainText("Take from Bank")
	await expect(saved.getByText("Take from Fund")).toHaveCount(0)
})
