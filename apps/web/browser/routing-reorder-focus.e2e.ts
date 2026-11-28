import { expect, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { interceptEdits, PLAN } from "./routing-rows"

// A keyboard move keeps focus on the row it moved (#856): the keyed row is moved in the document, and the browser drops
// focus with it, so a second Enter did nothing. The scratch plan's surplus list has three steps, so its first row moves
// down twice without turning Down off, and the last row moves up twice without turning Up off: those are the cases
// `keepFocus` missed. Reorder mode changes the order here and waits for Done, so this check never presses Done, and every
// Edit is intercepted: the shared ledger is never written.

test.describe.configure({ mode: "serial", timeout: 120_000 })

test("Down twice on the first surplus row moves it twice, and a third press acts, with focus kept", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	const edits = await interceptEdits(page)
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/routing/?scenario=${PLAN}`)
	await settle(page, "light")

	// The section's chart has a legend list of its own, so this reads the reorder list, not every listitem in the section.
	const surplus = page.locator('section[aria-labelledby="surplus"]')
	const rows = surplus.locator("ol > li")
	await expect(rows).toHaveCount(3)
	// The first step is the only one that says "of what is left"; the last says "Everything", at whatever index it shows.
	const banks = rows.filter({ hasText: "of what is left" })
	const last = rows.filter({ hasText: /Everything/ })
	const down = banks.getByRole("button", { name: / down$/ })
	const up = banks.getByRole("button", { name: / up$/ })

	// Down on the first row moves it to second, where its Down still has focus: the next Enter moves it again.
	await down.focus()
	await page.keyboard.press("Enter")
	await expect(rows.nth(1)).toContainText("of what is left")
	await expect(down).toBeFocused()

	// The second Enter moves it to the bottom, where Down is turned off: focus is on its Up instead.
	await page.keyboard.press("Enter")
	await expect(rows.nth(2)).toContainText("of what is left")
	await expect(up).toBeFocused()

	// The third press acts, so the row moves back up one place with focus still on it.
	await page.keyboard.press("Enter")
	await expect(rows.nth(1)).toContainText("of what is left")
	await expect(up).toBeFocused()

	// Up from the last row: it moves to second with its Up focused, then to the top, where Up turns off and Down has focus,
	// and the third press moves it down again.
	const lastUp = last.getByRole("button", { name: / up$/ })
	const lastDown = last.getByRole("button", { name: / down$/ })
	await lastUp.focus()
	await page.keyboard.press("Enter")
	await expect(rows.nth(1)).toContainText("Everything")
	await expect(lastUp).toBeFocused()
	await page.keyboard.press("Enter")
	await expect(rows.nth(0)).toContainText("Everything")
	await expect(lastDown).toBeFocused()
	await page.keyboard.press("Enter")
	await expect(rows.nth(1)).toContainText("Everything")
	await expect(lastDown).toBeFocused()

	// Reorder mode waits for Done, which this check never pressed: no Edit left the page, so nothing was written.
	expect(edits).toEqual([])
})
