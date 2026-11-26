import { expect, type Page, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { measureOverflow } from "./fit"

// The Tax profile page of the editable scratch Dashboard (cli ADR-0075): the shared home-loan interest is a field on a
// separate filing, a save sends `--mortgage-interest shared=<amount>`, and an emptied field clears the stored one.

// The server runs one Edit at a time, so the two widths take turns rather than racing for it.
test.describe.configure({ mode: "serial" })

/** How long a save may take: the server runs the write and then reads the whole Snapshot again, through the real CLI. */
const SLOW = 120_000

/** The scratch plan one width writes, so the two checks never share a stored profile. */
const PLAN = { 360: "shared-360", 1280: "shared-1280" } as const

async function openScratch(page: Page, plan: string): Promise<void> {
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/settings/tax/?scenario=${plan}`)
	await settle(page, "light")
}

async function fits(page: Page): Promise<void> {
	const fit = await measureOverflow(page, true)
	expect(fit.tables, "tables outside a scroll box").toEqual([])
	expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
}

for (const width of [360, 1280] as const) {
	test(`the Tax profile sets and clears the shared home-loan interest at ${width}px`, async ({
		page,
	}) => {
		// A save re-reads the whole Snapshot through the real command line, which takes longer than a render.
		test.setTimeout(180_000)
		await page.setViewportSize({ width, height: 800 })
		await openScratch(page, PLAN[width])
		const dialog = page.getByRole("dialog")

		// Set it: the Home card opens the form, which offers the field on a separate filing.
		await page.getByRole("button", { name: "Edit home" }).click()
		const field = dialog.getByLabel("Shared home-loan interest")
		await expect(field).toBeVisible()
		await field.fill("60000")
		await dialog.getByRole("button", { name: "Save", exact: true }).click()
		await expect(dialog).toBeHidden({ timeout: SLOW })
		await expect(
			page.getByText(
				"Shared home-loan interest, half in a year both have income; otherwise the Return with income claims it all:",
			),
		).toBeVisible({ timeout: SLOW })
		await expect(page.locator("main")).toContainText("60,000 THB")
		await fits(page)

		// A whole write fills the stored interest in, so stating the whole profile keeps it.
		await page.getByRole("button", { name: "Edit home" }).click()
		await dialog.getByRole("button", { name: "State the whole profile instead" }).click()
		await dialog.getByLabel("Filing status").selectOption("married_separate")
		await expect(dialog.getByLabel("Shared home-loan interest")).toHaveValue("60000")
		await dialog.getByRole("button", { name: "Save", exact: true }).click()
		await expect(dialog).toBeHidden({ timeout: SLOW })
		await expect(
			page.getByText(
				"Shared home-loan interest, half in a year both have income; otherwise the Return with income claims it all:",
			),
		).toBeVisible({ timeout: SLOW })
		await expect(page.locator("main")).toContainText("60,000 THB")
		await fits(page)

		// Clearing the filled-in value says what the save drops before it is saved.
		await page.getByRole("button", { name: "Edit home" }).click()
		await dialog.getByRole("button", { name: "State the whole profile instead" }).click()
		await dialog.getByLabel("Filing status").selectOption("married_separate")
		await expect(dialog.getByLabel("Shared home-loan interest")).toHaveValue("60000")
		await dialog.getByLabel("Shared home-loan interest").fill("")
		await expect(dialog).toContainText(
			"This save drops the stored shared home-loan interest of 60,000 THB.",
		)
		await dialog.getByRole("button", { name: "Close the drawer" }).click()

		// Clear it: an emptied amount is stated as zero, which removes the stored interest.
		await page.getByRole("button", { name: "Edit home" }).click()
		await expect(dialog.getByLabel("Shared home-loan interest")).toHaveValue("60000")
		await dialog.getByLabel("Shared home-loan interest").fill("")
		await dialog.getByRole("button", { name: "Save", exact: true }).click()
		await expect(dialog).toBeHidden({ timeout: SLOW })
		await expect(
			page.getByText(
				"Shared home-loan interest, half in a year both have income; otherwise the Return with income claims it all:",
			),
		).toHaveCount(0, { timeout: SLOW })
		await fits(page)
	})
}
