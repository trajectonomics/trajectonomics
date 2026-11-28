import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { SCREENSHOTS } from "./demo"
import { deleteScratchPlan, expectNoSideScroll, fillHolder, walkSteps } from "./guided-plan"

// The guided plan's write on the scratch ledger: one Save makes the plan and opens Home, and a Reload takes a moved
// ledger back to the money step (web ADR 0031).
const SHOTS = process.env["TRAJ_WEB_GUIDED_SHOTS"] ?? `${SCREENSHOTS}/guided`
const DEMO = readFileSync(new URL("../public/demo/snapshot.json", import.meta.url), "utf8")

test("the guided plan saves end to end on the scratch ledger", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await page.goto(`${SCRATCH_ORIGIN}/plans/new/`)
	await expect(page.getByRole("heading", { name: "New plan" })).toBeVisible()
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	const income = page.getByLabel("Income per month")
	if ((await income.count()) > 0) {
		await income.fill("50000")
		await page.getByLabel("Spending per month").fill("20000")
	}
	await page.getByRole("button", { name: "Next" }).click()
	await page.getByLabel("Stop-work age").fill("60")
	await page.getByLabel("Plan name").fill("guided-e2e")
	await page.getByRole("button", { name: "Save plan" }).click()
	await expect(page).toHaveURL(/scenario=guided-e2e/, { timeout: 90_000 })
	await page.goto(`${SCRATCH_ORIGIN}/plans/?scenario=guided-e2e`)
	// The Plans page reads the Snapshot the save left; under a shard's load that read can take longer than the default wait.
	await expect(page.getByText("guided-e2e").first()).toBeVisible({ timeout: 60_000 })
	await expectNoSideScroll(page)
	await page.screenshot({ path: `${SHOTS}/scratch/1280/4-saved.png`, fullPage: true })
	await deleteScratchPlan(page, "guided-e2e")
})

test("Reload takes focus back to the money step when the ledger moved", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await page.goto(`${SCRATCH_ORIGIN}/plans/new/`)
	await walkSteps(page, "guided-reload")
	// The server refuses this one save as a ledger that moved since the page read it; the next read is real.
	await page.route(
		"**/edit",
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					ok: false,
					error: {
						code: "guided_ledger_changed",
						exitCode: 2,
						message: "The ledger changed since this page read it.",
						hint: "Reload and check your money again.",
					},
				}),
			})
		},
		{ times: 1 },
	)
	await page.getByRole("button", { name: "Save plan" }).click()
	await expect(page.getByRole("alert")).toBeFocused()
	await expect(page.getByText("Reload and check your money again.")).toBeVisible()
	// The reread answers the Demo Snapshot, so the step change does not wait behind another test's write.
	await page.route("**/reread", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ ok: true, snapshot: JSON.parse(DEMO) }),
		})
	})
	await page.getByRole("button", { name: "Reload" }).click()
	await expect(page.getByRole("heading", { name: "Your money" })).toBeFocused({ timeout: 30_000 })
})
