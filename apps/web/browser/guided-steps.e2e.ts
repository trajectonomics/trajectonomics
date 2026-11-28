import { expect, test } from "@playwright/test"
import { BASE_URL, SCRATCH_ORIGIN } from "./base-url"
import { chooseBeforeLoad, SCREENSHOTS, settle } from "./demo"
import { fillHolder } from "./guided-plan"

// The guided plan's keyboard and drawer behaviour (web ADR 0031): a step announces itself, the New plan drawer closes
// before the steps show, and Hide amounts masks every figure the money step holds.
const SHOTS = process.env["TRAJ_WEB_GUIDED_SHOTS"] ?? `${SCREENSHOTS}/guided`

test("the step heading takes focus after Next and Back", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await page.goto(`${BASE_URL}/plans/new/?demo=1`)
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	await expect(page.getByRole("heading", { name: "Your money" })).toBeFocused()
	await page.getByRole("button", { name: "Back" }).click()
	await expect(page.getByRole("heading", { name: "You and your household" })).toBeFocused()
})

test("Set up step by step closes the New plan drawer and leaves the steps interactive", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await page.goto(`${SCRATCH_ORIGIN}/plans/`)
	await expect(page.getByRole("heading", { name: "Plans", exact: true })).toBeVisible()
	await page.getByRole("button", { name: /^Plan: .+\. Change plan$/ }).click()
	await page.getByRole("menuitem", { name: "New plan" }).click()
	const drawer = page.getByRole("dialog")
	await expect(drawer).toBeVisible()
	await drawer.getByRole("link", { name: "Set up step by step" }).click()
	await expect(drawer).toBeHidden()
	await expect(page).toHaveURL(/\/plans\/new\//)
	const name = page.getByLabel("Name").first()
	await name.fill("Mali")
	await expect(name).toHaveValue("Mali")
})

test("the money step at 360px shows each amount behind a mask when Hide amounts is on", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await chooseBeforeLoad(page, { theme: "light", hideAmounts: false })
	await page.goto(`${BASE_URL}/plans/new/?demo=1`)
	await settle(page, "light")
	await fillHolder(page)
	await page.getByRole("button", { name: "Next" }).click()
	await expect(page.getByRole("heading", { name: "Your money" })).toBeVisible()
	await page.screenshot({
		path: `${SHOTS}/hide-amounts/360/money-amounts-off.png`,
		fullPage: true,
	})
	await page.getByRole("button", { name: "Hide amounts" }).click()
	await expect(page.locator('input[placeholder="•••••"]').first()).toBeVisible()
	await expect(page.getByText("•••••").first()).toBeVisible()
	await page.screenshot({
		path: `${SHOTS}/hide-amounts/360/money-amounts-on.png`,
		fullPage: true,
	})
})
