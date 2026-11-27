import { expect, test } from "@playwright/test"
import { authorizePath } from "./oauth"
import { answerConsent, redeemDeviceCode, requestDeviceCode, signUp } from "./people"

test("the device page approves a code, and the CLI poll gets tokens and a revocable grant", async ({
	page,
}) => {
	const user = await signUp(page)
	await answerConsent(page)
	const code = await requestDeviceCode(page)
	await page.goto(`/device/?user_code=${encodeURIComponent(code.userCode)}`)
	await expect(page.getByText("traj data collector")).toBeVisible()
	await expect(page.getByText("Send your AI usage numbers to the data site")).toBeVisible()
	// The collector gets only the account id, so the page never says it sees a name or an email.
	await expect(page.getByText("Know which account you are")).toBeVisible()
	await expect(page.getByText(/See your/)).toHaveCount(0)
	// RFC 8628 §3.3.1 and §5.4: the person must be able to match the code against the app's screen,
	// and must see which account is about to be linked.
	await expect(page.locator(".device-code")).toHaveText(
		code.userCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
	)
	await expect(page.getByText(user.email)).toBeVisible()
	await expect(
		page.getByText("Only approve if this code is shown on your own device."),
	).toBeVisible()
	await page.getByRole("button", { name: "Approve" }).click()
	await expect(page.getByText("Approved. You can close this page.")).toBeVisible()
	// The decision is the end of the page, so it takes the focus and is read out.
	await expect(page.getByRole("status")).toBeFocused()
	await page.waitForTimeout(code.interval * 1_000 + 250)
	const token = await redeemDeviceCode(page, code.deviceCode)
	expect(token.access_token.length).toBeGreaterThan(0)

	await page.goto("/account/")
	await expect(page.getByText("traj data collector")).toBeVisible()
	const opener = page.getByRole("button", { name: "Revoke: traj data collector" })
	await opener.click()
	// Revoking asks once, in the row, before it removes anything.
	await expect(page.getByText("Revoke access?")).toBeVisible()
	// Cancel returns the reader to the button that asked the question, not to BODY.
	await page.locator(".confirm-row").getByRole("button", { name: "Cancel" }).click()
	await expect(opener).toBeFocused()
	await opener.click()
	await expect(page.getByText("Revoke access?")).toBeVisible()
	await page.locator(".confirm-row").getByRole("button", { name: "Revoke" }).click()
	await expect(page.getByText("No app is connected.")).toBeVisible()
	// The row that held the button is gone; the section title holds the reader's place.
	await expect(page.getByRole("heading", { name: "Devices and apps" })).toBeFocused()
})

test("a first OAuth sign-in asks the marketing question before the consent page", async ({
	page,
}) => {
	await signUp(page)
	await page.goto(authorizePath("e2e-first"))
	await page.waitForURL(/\/welcome\//)
	await expect(page.getByRole("checkbox")).not.toBeChecked()
	await page.getByRole("button", { name: "Continue" }).click()
	await page.waitForURL(/\/consent\//)
	await expect(page.getByRole("heading", { name: /Trajectonomics data site/ })).toBeVisible()
})

test("the web client's consent page names the app, then allows the flow", async ({ page }) => {
	await signUp(page)
	await answerConsent(page)
	await page.route("https://trajectonomics.com/**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "text/html",
			body: "<!doctype html><title>callback</title>",
		}),
	)
	await page.goto(authorizePath("e2e-state"))
	await page.waitForURL(/\/consent\//)
	await expect(page.getByRole("heading", { name: /Trajectonomics data site/ })).toBeVisible()
	await expect(page.getByText("See your name, email and profile picture")).toBeVisible()
	const callback = page.waitForRequest((request) =>
		request.url().startsWith("https://trajectonomics.com/data/auth/callback?"),
	)
	await page.getByRole("button", { name: "Allow" }).click()
	const url = (await callback).url()
	expect(url).toContain("code=")
	expect(url).toContain("state=e2e-state")
})
