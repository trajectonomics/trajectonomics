import { expect, type Page, test } from "@playwright/test"
import { answerConsent, signUp } from "./people"

const EXPIRED = "?client_id=traj-data-web&sig=c2lnbmF0dXJl&exp=1&ba_iat=1764259200000"

/**
 * The page judges a signed query's expiry by the server's `Date` header. The local dev server does
 * not send one, so this adds it to the real get-session answer; the page then sees `exp=1` as past.
 */
async function stampServerClock(page: Page): Promise<void> {
	await page.route("**/api/auth/get-session", async (route) => {
		const response = await route.fetch()
		await route.fulfill({
			response,
			headers: { ...response.headers(), date: new Date().toUTCString() },
		})
	})
}

test("an expired signed flow on the first question says so and offers no retry", async ({
	page,
}) => {
	await signUp(page)
	await stampServerClock(page)
	await page.goto(`/welcome/${EXPIRED}`)
	await expect(
		page.getByText("This sign-in took too long. Go back to the app and start again."),
	).toBeVisible()
	await expect(page.getByRole("checkbox")).toHaveCount(0)
	await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0)
})

test("an expired signed flow on the consent page says so in Thai too", async ({ page }) => {
	await signUp(page)
	await answerConsent(page)
	await stampServerClock(page)
	await page.goto(`/th/consent/${EXPIRED}`)
	await expect(page.getByText("การเข้าสู่ระบบนี้ใช้เวลานานเกินไป กลับไปที่แอปแล้วเริ่มใหม่")).toBeVisible()
	await expect(page.getByRole("button", { name: "อนุญาต" })).toHaveCount(0)
	await expect(page.getByRole("button", { name: "ปฏิเสธ" })).toHaveCount(0)
})

for (const status of [500, 429]) {
	test(`a ${status} from get-session shows an error state with a retry`, async ({ page }) => {
		await signUp(page)
		await answerConsent(page)
		await page.route("**/api/auth/get-session", (route) =>
			route.fulfill({
				status,
				contentType: "application/json",
				body: JSON.stringify({ message: "unavailable" }),
			}),
		)
		await page.goto("/account/")
		await expect(page.getByRole("alert")).toContainText("Some of this did not load")
		// No half-read page: no empty list, and no switch that looks like a real answer.
		await expect(page.getByRole("switch", { name: "Email updates" })).toHaveCount(0)
		await expect(page.getByText("No app is connected.")).toHaveCount(0)

		await page.unroute("**/api/auth/get-session")
		await page.getByRole("button", { name: "Try again" }).click()
		await expect(page.getByRole("heading", { name: "E2E Person" })).toBeVisible()
	})
}

test("a failed device lookup keeps the page on a retry, not on a spinner", async ({ page }) => {
	await signUp(page)
	await answerConsent(page)
	await page.route("**/api/auth/device*", (route) =>
		route.fulfill({
			status: 500,
			contentType: "application/json",
			body: JSON.stringify({ message: "unavailable" }),
		}),
	)
	await page.goto("/device/?user_code=ABCD-EFGH")
	await expect(page.getByRole("alert")).toContainText("Something went wrong")
	await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
})
