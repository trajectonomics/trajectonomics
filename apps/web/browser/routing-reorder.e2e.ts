import { expect, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { interceptEdits, moveFirstDown, nameOf, opensAccount, PLAN, saved } from "./routing-rows"

// A routing row's buttons act on the item the row shows (#829). The Demo has no write path, so this runs on the scratch
// Dashboard, whose own `row-order-360` plan takes from Bank then Fund, and fills Bank, Fund and Fund. The check moves the
// first row down without saving, then opens and removes it: every Edit is intercepted, so the shared ledger is never
// written and no other check waits for the one Edit at a time the server allows.

test.describe.configure({ mode: "serial", timeout: 120_000 })

test("the first withdrawal row after an unsaved reorder edits, tries and removes its own entry", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	const edits = await interceptEdits(page)
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/routing/?scenario=${PLAN}`)
	await settle(page, "light")

	const { cashflow, accounts } = await saved(page)
	const fund = nameOf(accounts, cashflow.withdraw[1])
	const withdraw = page.locator('section[aria-labelledby="withdraw"]')
	const row = await moveFirstDown(withdraw)
	await expect(row).toContainText("Take from Fund")

	// Edit and Try open the drawer on the row's own entry, the second saved one, and send no Edit.
	await opensAccount(page, row, /^Edit /, "entry-account", fund, false)
	expect(edits).toEqual([])
	await opensAccount(page, row, /^Try /, "entry-account", fund, true)
	expect(edits).toEqual([])

	const sent = page.waitForRequest(
		(request) => request.method() === "POST" && request.url().endsWith("/edit"),
	)
	await row.getByRole("button", { name: /^Remove…/ }).click()
	await row.getByRole("button", { name: /^Remove entry 1/ }).click()
	await sent
	await expect.poll(() => edits.length).toBe(1)
	// The saved list keeps its first entry, Bank, and drops the row's own, Fund.
	expect(edits[0]?.document.cashflow.withdraw).toEqual([cashflow.withdraw[0]])
})

test("the first surplus row after an unsaved reorder edits, tries and removes its own step", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	const edits = await interceptEdits(page)
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/routing/?scenario=${PLAN}`)
	await settle(page, "light")

	const { cashflow, accounts } = await saved(page)
	const [bank, middle, last] = cashflow.surplus
	if (middle === undefined) throw new Error("The plan fills an account before its last step")
	const surplus = page.locator('section[aria-labelledby="surplus"]')
	const row = await moveFirstDown(surplus)
	await expect(row).toContainText("Fill Fund up to")

	await opensAccount(page, row, /^Edit /, "step-account", nameOf(accounts, middle.account), false)
	expect(edits).toEqual([])
	await opensAccount(page, row, /^Try /, "step-account", nameOf(accounts, middle.account), true)
	expect(edits).toEqual([])

	const sent = page.waitForRequest(
		(request) => request.method() === "POST" && request.url().endsWith("/edit"),
	)
	await row.getByRole("button", { name: /^Remove…/ }).click()
	await row.getByRole("button", { name: /^Remove step 1/ }).click()
	await sent
	await expect.poll(() => edits.length).toBe(1)
	// The saved list keeps its first step and its last, which still takes everything that is left.
	expect(edits[0]?.document.cashflow.surplus).toEqual([bank, last])
})
