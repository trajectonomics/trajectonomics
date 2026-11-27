import { expect, test } from "@playwright/test"
import { answerConsent, consentState, signUp } from "./people"

test("the sign-in page shows the three ways in and one pair of legal links", async ({ page }) => {
	await page.goto("/sign-in/")
	await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Sign in with a passkey" })).toBeVisible()
	// The footer carries Privacy and Terms once; the card does not repeat them.
	await expect(page.getByRole("link", { name: "Privacy" })).toHaveCount(1)
	await expect(page.getByRole("link", { name: "Terms" })).toHaveCount(1)
	await expect(page.locator("footer").getByRole("link", { name: "Privacy" })).toHaveAttribute(
		"href",
		"/privacy/",
	)
	await expect(page.locator("footer").getByRole("link", { name: "Terms" })).toHaveAttribute(
		"href",
		"/terms/",
	)
	// The header names the page, not "Account" everywhere.
	await expect(page.locator(".ds-marker")).toHaveText("Sign in")
})

test("the first sign-in asks once and records optedIn false by default", async ({ page }) => {
	const user = await signUp(page)
	await page.goto("/account/")
	await page.waitForURL(/\/welcome\//)
	await expect(page.getByRole("checkbox")).not.toBeChecked()
	await page.getByRole("button", { name: "Continue" }).click()
	await page.waitForURL(/\/account\/$/)
	await expect(page.getByRole("heading", { name: user.name })).toBeVisible()
	expect(await consentState(page)).toEqual({
		optedIn: false,
		source: "first-sign-in",
		language: "en",
	})
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
