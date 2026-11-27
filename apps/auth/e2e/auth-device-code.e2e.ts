import { expect, test } from "@playwright/test"
import { answerConsent, requestDeviceCode, signUp } from "./people"

test("a code typed on a bare device page shows the signed-in email in the review", async ({
	page,
}) => {
	const user = await signUp(page)
	await answerConsent(page)
	const code = await requestDeviceCode(page)
	await page.goto("/device/")
	const field = page.getByLabel("Code from your app")
	await field.fill(code.userCode.toLowerCase())
	await page.getByRole("button", { name: "Continue" }).click()
	await expect(page.getByText("traj data collector")).toBeVisible()
	await expect(page.locator(".device-email")).toHaveText(user.email)
	// The review shows the value the server will match: upper-case, with no dashes or spaces.
	await expect(page.locator(".device-code")).toHaveText(
		code.userCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
	)
	await page.getByRole("button", { name: "Deny" }).click()
	await expect(page.getByText("Denied. Nothing was connected.")).toBeVisible()
})

test("retyping a real code after an invalid ?user_code= still shows the email", async ({
	page,
}) => {
	const user = await signUp(page)
	await answerConsent(page)
	const code = await requestDeviceCode(page)
	await page.goto("/device/?user_code=ZZZZZZZZ")
	const field = page.getByLabel("Code from your app")
	await field.fill(code.userCode)
	await page.getByRole("button", { name: "Continue" }).click()
	await expect(page.locator(".device-email")).toHaveText(user.email)
	await page.getByRole("button", { name: "Deny" }).click()
	await expect(page.getByText("Denied. Nothing was connected.")).toBeVisible()
})
