import { expect, test } from "@playwright/test"
import { authorizePath } from "./oauth"
import { answerConsent, redeemDeviceCode, requestDeviceCode, signUp } from "./people"

test("the device page approves a code, and the CLI poll gets tokens and a revocable grant", async ({
	page,
}) => {
	await signUp(page)
	await answerConsent(page)
	const code = await requestDeviceCode(page)
	await page.goto(`/device/?user_code=${encodeURIComponent(code.userCode)}`)
	await expect(page.getByText("traj data collector")).toBeVisible()
	await expect(page.getByText("Send your AI usage numbers to the data site")).toBeVisible()
	await page.getByRole("button", { name: "Approve" }).click()
	await expect(page.getByText("Approved. You can close this page.")).toBeVisible()
	await page.waitForTimeout(code.interval * 1_000 + 250)
	const token = await redeemDeviceCode(page, code.deviceCode)
	expect(token.access_token.length).toBeGreaterThan(0)

	await page.goto("/account/")
	await expect(page.getByText("traj data collector")).toBeVisible()
	await page.getByRole("button", { name: "Revoke: traj data collector" }).click()
	await expect(page.getByText("No app is connected.")).toBeVisible()
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
	await expect(page.getByText("See your name and picture")).toBeVisible()
	const callback = page.waitForRequest((request) =>
		request.url().startsWith("https://trajectonomics.com/data/auth/callback?"),
	)
	await page.getByRole("button", { name: "Allow" }).click()
	const url = (await callback).url()
	expect(url).toContain("code=")
	expect(url).toContain("state=e2e-state")
})
