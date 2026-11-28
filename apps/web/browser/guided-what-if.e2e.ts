import { readFileSync } from "node:fs"
import { expect, type Page, test } from "@playwright/test"
import { BASE_URL } from "./base-url"
import { chooseBeforeLoad, settle } from "./demo"
import { fillHolder } from "./guided-plan"

// A What-if that holds another plan keeps a guided Save from opening its plan (web ADR 0031): the page says the plan
// saved and waits, and its one sentence and its focus survive Stay, Revert and Revert-and-switch (#845). The token and
// both Edits are this check's own answers, so the shared scratch ledger is never written (#851).
const DEMO = readFileSync(new URL("../public/demo/snapshot.json", import.meta.url), "utf8")

/** Serves the Demo as the loopback read, and answers the Edit path itself: a save that lands and changes nothing. */
async function editableDemo(page: Page): Promise<void> {
	await page.route(/\/snapshot\.json$/, (route) =>
		route.fulfill({ contentType: "application/json", body: DEMO }),
	)
	await page.route(/\/edit-session$/, (route) => route.fulfill({ json: { token: "browser" } }))
	await page.route(/\/edit$/, (route) =>
		route.fulfill({
			contentType: "application/json",
			body: JSON.stringify({ ok: true, snapshot: JSON.parse(DEMO) }),
		}),
	)
}

/** Opens a What-if on the items page, then walks to the guided plan and saves while it still holds the plan. */
async function blockedSave(page: Page, name: string): Promise<void> {
	await chooseBeforeLoad(page, { theme: "light" })
	await page.goto(`${BASE_URL}/income/`)
	await settle(page, "light")
	await page.getByRole("switch").first().click()
	await expect(page.getByRole("region", { name: "What-if session" })).toBeVisible()
	// The drawer's link is a client-side change, so the session is still open on the guided page.
	await page.getByRole("button", { name: /Change plan/ }).click()
	await page.getByRole("menuitem", { name: "New plan" }).click()
	await page.getByRole("link", { name: "Set up step by step" }).click()
	await expect(page.getByRole("heading", { name: "New plan" })).toBeVisible()
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	await page.getByRole("button", { name: "Next" }).click()
	await page.getByLabel("Stop-work age").fill("60")
	await page.getByLabel("Plan name", { exact: true }).fill(name)
	await page.getByRole("button", { name: "Save plan" }).click()
	await expect(page.getByText(`Saved ${name}.`)).toBeVisible({ timeout: 30_000 })
}

for (const [label, name] of [
	["Stay, then Revert", "guided-stay"],
	["Revert and switch", "guided-switch"],
] as const) {
	test(`${label} returns focus to the saved sentence, which points at Open once no What-if holds it`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 })
		await editableDemo(page)
		await blockedSave(page, name)
		const sentence = page.locator("p[tabindex='-1']")
		await expect(sentence).toHaveText(`Saved ${name}. Settle the What-if above, then open it.`)
		if (label === "Stay, then Revert") {
			await page.getByRole("button", { name: /^Stay on / }).click()
			await expect(sentence).toBeFocused()
			await expect(sentence).toHaveText(`Saved ${name}. Settle the What-if above, then open it.`)
			await page.getByRole("button", { name: "Revert", exact: true }).click()
			await expect(sentence).toHaveText(`Saved ${name}. Open it.`)
			await expect(sentence).toBeFocused()
			// Leaving and coming back keeps the sentence, with no What-if above it to settle.
			await page.getByRole("link", { name: "Overview" }).click()
			await expect(
				page.getByRole("heading", { level: 1, name: /this is your current situation/ }),
			).toBeVisible()
			await page.getByRole("button", { name: /Change plan/ }).click()
			await page.getByRole("menuitem", { name: "New plan" }).click()
			await page.getByRole("link", { name: "Set up step by step" }).click()
			await expect(page.getByText(`Saved ${name}. Open it.`)).toBeVisible()
			return
		}
		await page.getByRole("button", { name: "Revert and switch" }).click()
		await expect(sentence).toHaveText(`Saved ${name}. Open it.`)
		await expect(sentence).toBeFocused()
	})
}
