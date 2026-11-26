import { expect, type Page, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { measureOverflow } from "./fit"

// The scratch Dashboard's `swap-360` plan is the Demo's separate couple with its household's holder and partner swapped
// before `--from-stored` ran (cli ADR-0075). The cards name whose claims the flat keys are, and every control that would
// write them to the new holder waits with the command that fixes it. The check runs at 360px, the phone width of #352.

const NOTE =
	"These claims are still recorded under your partner. Run `traj scenario tax swap-360 --from-stored` to record them under each person, then edit them here."

async function fits(page: Page): Promise<void> {
	const fit = await measureOverflow(page, true)
	expect(fit.tables, "tables outside a scroll box").toEqual([])
	expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
}

test("the swapped household's Tax profile waits for --from-stored at 360px", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${SCRATCH_ORIGIN}/settings/tax/?scenario=swap-360`)
	await settle(page, "light")
	await expect(page.locator("main")).toContainText(NOTE)
	for (const name of ["Edit family", "Edit insurance", "Edit giving", "Edit social security"]) {
		await expect(page.getByRole("button", { name, exact: true })).toBeDisabled()
	}
	await expect(page.getByRole("button", { name: "Edit home", exact: true })).toBeEnabled()
	await expect(page.getByRole("button", { name: "Edit filing status", exact: true })).toBeEnabled()
	const missing = page.locator("section[aria-labelledby='tax-not-stated']")
	await expect(
		missing.getByRole("button", {
			name: "Relatives with a disability your partner cares for",
			exact: true,
		}),
	).toBeDisabled()
	await expect(
		missing.getByRole("button", { name: "Home-loan interest", exact: true }),
	).toBeDisabled()
	await expect(missing.getByRole("link", { name: /ThaiESG contributions/ })).toBeEnabled()
	await fits(page)

	// The Home drawer keeps the shared interest writable and waits on each Return's own home-loan interest.
	await page.getByRole("button", { name: "Edit home", exact: true }).click()
	const dialog = page.getByRole("dialog")
	await expect(dialog).toContainText("still recorded under your partner")
	await expect(dialog.getByLabel("Home-loan interest", { exact: true })).toBeDisabled()
	await expect(dialog.getByLabel("Shared home-loan interest", { exact: true })).toBeEnabled()
	await dialog.getByRole("button", { name: "Close the drawer" }).click()
	await expect(dialog).toBeHidden()
	await fits(page)
})
