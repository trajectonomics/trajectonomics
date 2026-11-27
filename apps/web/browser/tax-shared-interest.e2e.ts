import { expect, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { maskedAmountEdit } from "./masked-amount"
import { maskedAmountFocusAway } from "./masked-away"
import { maskedAmountTabSwitch, maskedAmountTabThenClick } from "./masked-focus"
import { maskedAmountPasteMask, maskedAmountUndo } from "./masked-undo"
import { SLOW, setsAndClears } from "./shared-interest"
import { taxLabelAlert } from "./tax-label-alert"
import { taxLabelRefusalAtFlow } from "./tax-label-wiring"

// The write checks of the editable scratch Dashboard (cli ADR-0075): the shared home-loan interest of the Tax profile
// page, a masked amount in the Income drawer (#761), and the Tax labels form's refusal alert (#761).

// The server runs one Edit at a time, so every check here takes turns rather than racing for it.
test.describe.configure({ mode: "serial" })

for (const width of [360, 1280] as const) {
	test(`the Tax profile sets and clears the shared home-loan interest at ${width}px`, async ({
		page,
	}) => {
		// A save re-reads the whole Snapshot through the real command line, which takes longer than a render.
		test.setTimeout(180_000)
		await setsAndClears(page, width)
	})
}

// A save from a locked drawer (#675): after a holder swap the Home drawer's own home-loan interest takes no input, and
// with Hide amounts on it shows only a mask. The scratch `locked-save-360` plan stores that interest before the swap,
// so a save that changes only the shared interest must leave it on the earlier holder's Return.
const LOCKED = { plan: "locked-save-360", homeLoan: "14,444" } as const

test("a save from a locked drawer keeps the stored home-loan interest", async ({ page }) => {
	test.setTimeout(180_000)
	await page.setViewportSize({ width: 360, height: 800 })
	await chooseBeforeLoad(page, { theme: "light", hideAmounts: true })
	await page.goto(`${SCRATCH_ORIGIN}/settings/tax/?scenario=${LOCKED.plan}`)
	await settle(page, "light")

	await page.getByRole("button", { name: "Edit home", exact: true }).click()
	const dialog = page.getByRole("dialog")
	await expect(dialog).toContainText("still recorded under your partner")
	// Hide amounts masks the locked field, so neither its digits nor its value reaches the drawer.
	const locked = dialog.locator("output#tax-mortgageInterest")
	await expect(locked).toBeVisible()
	await expect(locked).toContainText("amount hidden")
	await expect(dialog).not.toContainText("14,444")
	await expect(dialog).not.toContainText("14444")

	// Only the shared interest, which is not a flat claim, takes input; the plan stores none yet.
	const shared = dialog.getByLabel("Shared home-loan interest", { exact: true })
	await expect(shared).toBeEnabled()
	await expect(shared).toHaveValue("")
	await shared.fill("30000")
	const sent = page.waitForRequest(
		(request) => request.method() === "POST" && request.url().includes("/edit"),
	)
	await dialog.getByRole("button", { name: "Save", exact: true }).click()
	// The save sends the shared interest alone: a locked field sends nothing, not even a removal.
	expect((await sent).postDataJSON().flags).toEqual({ sharedMortgageInterest: "30000" })
	await expect(dialog).toBeHidden({ timeout: SLOW })
	// The page read the plan again after the save: the shared interest is stored, still hidden.
	await expect(
		page.getByText(
			"Shared home-loan interest, half in a year both have income; otherwise the Return with income claims it all:",
		),
	).toBeVisible({ timeout: SLOW })
	await expect(page.locator("main")).toContainText("amount hidden")

	// Show the amounts: the earlier holder's own interest is still stored, on the column of their Return.
	await page.getByRole("button", { name: "Display options" }).click()
	await page.getByRole("dialog").getByRole("button", { name: "Hide amounts" }).click()
	await page.getByRole("button", { name: "Close Display options" }).click()
	const claims = page.locator("section[aria-labelledby='tax-claims-title']")
	await expect(claims).toContainText("30,000 THB")
	const home = claims
		.getByRole("row")
		.filter({ has: page.getByRole("rowheader", { name: "Home-loan interest", exact: true }) })
	const headers = await claims.locator("thead th").allInnerTexts()
	const column = headers.findIndex((text) => text.trim() === "Your partner")
	expect(column, "the claims table names the earlier holder's column").toBeGreaterThan(0)
	await expect(home.locator("td").nth(column - 1)).toContainText(`${LOCKED.homeLoan} THB`)
})

// Hide amounts must not let a masked amount be appended to, and a refusal must keep focus where the person put it.
test("typing into a masked amount replaces it, and a click selects the whole value", async ({
	page,
}) => {
	test.setTimeout(180_000)
	await maskedAmountEdit(page)
})

// A tab switch in the middle of typing must not drop the digits typed before it (web #783).
test("a tab switch mid-typing keeps the digits typed before it", async ({ page }) => {
	test.setTimeout(180_000)
	await maskedAmountTabSwitch(page)
})

// A click after a keyboard focus moves the caret, so typing appends rather than replacing (web #783).
test("a click after keyboard focus moves the caret, so typing appends", async ({ page }) => {
	test.setTimeout(180_000)
	await maskedAmountTabThenClick(page)
})

test("a refusal keeps its message and never takes focus again when the Flow select moves", async ({
	page,
}) => {
	test.setTimeout(180_000)
	await taxLabelAlert(page)
})

// An undo can put the mask back into a masked amount, which must show the mask, not the draft it hides (web #783).
test("an undo at a masked amount shows the mask, and keeps the amount", async ({ page }) => {
	test.setTimeout(180_000)
	await maskedAmountUndo(page)
})

// A paste that holds the mask is dropped, and the caret stays where the paste was (web #783).
test("a paste holding the mask keeps the caret where the paste was", async ({ page }) => {
	test.setTimeout(180_000)
	await maskedAmountPasteMask(page)
})

// A focus that moves while the window is away leaves no blur; the window's return must mask the field (web #783).
test("a focus moved while the window is away still masks the amount", async ({ page }) => {
	test.setTimeout(180_000)
	await maskedAmountFocusAway(page)
})

// A refusal at one Flow's label stays there after the Flow select moves, so the form matches on the sent Flow (web #783).
test("a refusal at a Flow's label stays after the Flow select moves", async ({ page }) => {
	test.setTimeout(180_000)
	await taxLabelRefusalAtFlow(page)
})
