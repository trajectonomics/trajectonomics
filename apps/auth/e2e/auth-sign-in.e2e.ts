import { expect, test } from "@playwright/test"
import { answerConsent, consentState, signUp } from "./people"

test("the sign-in page shows the three ways in and the two small links", async ({ page }) => {
	await page.goto("/sign-in/")
	await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Sign in with a passkey" })).toBeVisible()
	await expect(page.locator("main").getByRole("link", { name: "Privacy" })).toHaveAttribute(
		"href",
		"/privacy/",
	)
	await expect(page.locator("main").getByRole("link", { name: "Terms" })).toHaveAttribute(
		"href",
		"/terms/",
	)
})

test("the first sign-in asks once and records optedIn false by default", async ({ page }) => {
	const user = await signUp(page)
	await page.goto("/account/")
	await page.waitForURL(/\/welcome\//)
	await expect(page.getByRole("checkbox")).not.toBeChecked()
	await page.getByRole("button", { name: "Continue" }).click()
	await page.waitForURL(/\/account\/$/)
	await expect(page.getByRole("heading", { name: user.name })).toBeVisible()
	expect(await consentState(page)).toEqual({ optedIn: false, source: "first-sign-in" })
})

test("the root sends a signed-out person to sign in and a signed-in person to the account", async ({
	page,
}) => {
	await page.goto("/")
	await page.waitForURL(/\/sign-in\/$/)
	await signUp(page)
	await answerConsent(page)
	await page.goto("/")
	await page.waitForURL(/\/account\/$/)
	await page.getByRole("switch", { name: "Email updates" }).waitFor()
})
