import { expect, type Locator, type Page, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { PLAN } from "./routing-rows"

// An inline action's refusal shows beside the control that sent it (#810). The checks run at 360px on the scratch
// Dashboard and write nothing there: every /edit and /reread is answered here and never reaches the server (#851).

/** `STALE_PLAN`: what a refusal over a plan that moved on says. */
const STALE = "This plan changed since the page read it."
const BUSY = "The ledger is busy. Try again."

/** Answers every request to `path` with a refusal written here, and counts them. */
async function refuse(page: Page, path: string, code: string, message: string): Promise<unknown[]> {
	const sent: unknown[] = []
	await page.route(`**${path}`, async (route) => {
		sent.push(route.request().postDataJSON())
		await route.fulfill({ json: { ok: false, error: { code, exitCode: 3, message } } })
	})
	return sent
}

async function open(page: Page, path: string): Promise<void> {
	await page.setViewportSize({ width: 360, height: 800 })
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}${path}`)
	await settle(page, "light")
}

/** The page's one visible alert with these words, which is inside `beside` and holds focus. */
async function saidOnce(page: Page, beside: Locator, words: string): Promise<void> {
	const alert = beside.getByRole("alert").filter({ hasText: words })
	await expect(alert).toBeVisible()
	await expect(alert).toBeFocused()
	await expect(page.getByRole("alert").filter({ hasText: words })).toHaveCount(1)
}

const section = (page: Page, id: string) => page.locator(`section[aria-labelledby="${id}"]`)

test("Done over a plan that changed says so after the order, and a Reload that fails says why there", async ({
	page,
}) => {
	const edits = await refuse(page, "/edit", "scenario_changed", "changed")
	await refuse(page, "/reread", "database_busy", BUSY)
	await open(page, `/routing/?scenario=${PLAN}`)
	const withdraw = section(page, "withdraw")
	await withdraw
		.getByRole("button", { name: /: move .* down$/ })
		.first()
		.click()
	await withdraw.getByRole("button", { name: "Done" }).click()
	await saidOnce(page, withdraw, STALE)
	expect(edits).toHaveLength(1)
	await page.screenshot({ path: "screenshots/inline-refusal/done-360.png", fullPage: false })

	await withdraw.getByRole("button", { name: "Reload" }).click()
	await expect(withdraw.getByRole("alert").filter({ hasText: BUSY })).toBeVisible()
	await expect(withdraw.getByRole("alert").filter({ hasText: STALE })).toBeVisible()
})

test("a dropped row that is refused says why under its list", async ({ page }) => {
	const edits = await refuse(page, "/edit", "database_busy", BUSY)
	await open(page, `/routing/?scenario=${PLAN}`)
	const withdraw = section(page, "withdraw")
	const rows = withdraw.getByRole("listitem")
	await rows.nth(0).dragTo(rows.nth(1))
	await saidOnce(page, withdraw, BUSY)
	expect(edits).toHaveLength(1)
})

test("a refused Remove says why in the row it was pressed in", async ({ page }) => {
	const edits = await refuse(page, "/edit", "database_busy", BUSY)
	await open(page, `/routing/?scenario=${PLAN}`)
	const row = section(page, "surplus").getByRole("listitem").first()
	await row.getByRole("button", { name: /^Remove…/ }).click()
	await row.getByRole("button", { name: /^Remove / }).click()
	await saidOnce(page, row, BUSY)
	expect(edits).toHaveLength(1)
	await row.screenshot({ path: "screenshots/inline-refusal/remove-360.png" })
})

test("a refused 'Make this my main plan' says why on that plan's card, until the page is left", async ({
	page,
}) => {
	const broke: Error[] = []
	page.on("pageerror", (error) => broke.push(error))
	const edits = await refuse(page, "/edit", "not_found", "No plan has that name.")
	await open(page, "/plans/?scenario=shared-360")
	const menu = page.locator('summary[aria-label="Actions for shared-360"]')
	const card = page.locator("article").filter({ has: menu })
	await menu.click()
	await card.getByRole("button", { name: "Make this my main plan" }).click()
	await saidOnce(page, card, "No plan has that name.")
	expect(edits).toEqual([{ kind: "set-main-plan", name: "shared-360" }])
	await card.screenshot({ path: "screenshots/inline-refusal/main-360.png" })

	await card.getByRole("link", { name: "Open the Plan for shared-360" }).click()
	await expect(page).toHaveURL(/\/projection\//)
	await page.goBack()
	await expect(menu).toBeVisible()
	await expect(page.getByRole("alert").filter({ hasText: "No plan has that name." })).toHaveCount(0)
	expect(broke).toEqual([])
})
