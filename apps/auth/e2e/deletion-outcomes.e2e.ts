import { expect, type Page, test } from "@playwright/test"
import { answerConsent, signUp } from "./people"
import { queryLocal, scratchDir } from "./scratch"

const scratch = scratchDir()
if (scratch === undefined) throw new Error("the e2e scratch database is missing")

// Reading the scratch D1 starts a second wrangler process, which is slow on a loaded machine.
test.setTimeout(60_000)

/** Fills the danger zone and presses Delete on the signed-in person's account page. */
async function pressDelete(page: Page, email: string): Promise<void> {
	await page.goto("/account/")
	await page.getByLabel("Type your email to confirm").fill(email)
	await page.getByRole("button", { name: "Delete my account" }).click()
}

function userRows(id: string): readonly { id: string }[] {
	return queryLocal<{ id: string }>(
		scratch as string,
		`select "id" from "user" where "id" = '${id}'`,
	)
}

test("a refused deletion whose sign-out also fails keeps the account page", async ({ page }) => {
	const user = await signUp(page)
	await answerConsent(page)
	const refuse = { status: 403, contentType: "application/json", body: '{"message":"forbidden"}' }
	let signOuts = 0
	await page.route("**/api/auth/delete-user", (route) => route.fulfill(refuse))
	await page.route("**/api/auth/sign-out", (route) => {
		signOuts += 1
		return route.fulfill(refuse)
	})
	await pressDelete(page, user.email)
	await expect(page.getByRole("alert")).toHaveText("The account was not deleted. Try again.")
	await expect(page.getByRole("alert")).toBeFocused()
	expect(signOuts).toBe(1)
	// The session is still there, so the page stays the account page and offers the retry.
	await expect(page.getByRole("switch", { name: "Email updates" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Delete my account" })).toBeEnabled()
	expect(userRows(user.id)).toHaveLength(1)
})

test("a refused deletion whose sign-out succeeds says so and offers a new sign-in", async ({
	page,
}) => {
	const user = await signUp(page)
	await answerConsent(page)
	const refuse = { status: 403, contentType: "application/json", body: '{"message":"forbidden"}' }
	await page.route("**/api/auth/delete-user", (route) => route.fulfill(refuse))
	await pressDelete(page, user.email)
	await expect(page.getByRole("alert")).toHaveText(
		"The account was not deleted. You were signed out; sign in again to try again.",
	)
	await expect(page.getByRole("alert")).toBeFocused()
	// The deletion was refused, so the account survives and nothing offers the controls of a
	// signed-in session again.
	expect(userRows(user.id)).toHaveLength(1)
	await expect(page.getByRole("switch", { name: "Email updates" })).toHaveCount(0)
	await expect(page.getByRole("button", { name: "Delete my account" })).toHaveCount(0)
	await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toBeVisible()
	// The sign-out really landed: a fresh read of the account page redirects to sign-in.
	await page.goto("/account/")
	await page.waitForURL(/\/sign-in\//)
})

test("a lost response claims nothing, and Reload shows what happened", async ({ page }) => {
	const user = await signUp(page)
	await answerConsent(page)
	let signOuts = 0
	page.on("request", (request) => {
		if (request.url().endsWith("/api/auth/sign-out")) signOuts += 1
	})
	// The server deletes the account, and its answer never reaches the page.
	await page.route("**/api/auth/delete-user", async (route) => {
		await route.fetch()
		await route.abort("failed")
	})
	await pressDelete(page, user.email)
	await expect(page.getByRole("alert")).toHaveText(
		"We couldn't confirm whether the account was deleted. Reload this page to check.",
	)
	await expect(page.getByRole("alert")).toBeFocused()
	expect(signOuts).toBe(0)
	await expect(page.getByRole("switch", { name: "Email updates" })).toHaveCount(0)
	await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toHaveCount(0)
	expect(userRows(user.id)).toHaveLength(0)

	await page.getByRole("button", { name: "Reload" }).click()
	await page.waitForURL(/\/sign-in\//)
})

test("a network error before the server leaves the account, and Reload shows it", async ({
	page,
}) => {
	const user = await signUp(page)
	await answerConsent(page, false, "th")
	await page.route("**/api/auth/delete-user", (route) => route.abort("failed"))
	await page.goto("/th/account/")
	await page.getByLabel("พิมพ์อีเมลของคุณเพื่อยืนยัน").fill(user.email)
	await page.getByRole("button", { name: "ลบบัญชีของฉัน" }).click()
	await expect(page.getByRole("alert")).toHaveText(
		"ยืนยันไม่ได้ว่าบัญชีถูกลบแล้วหรือไม่ โหลดหน้านี้ใหม่เพื่อตรวจสอบ",
	)
	await page.getByRole("button", { name: "โหลดใหม่" }).click()
	await expect(page.getByRole("heading", { name: user.name })).toBeVisible()
	expect(userRows(user.id)).toHaveLength(1)
})
