import { expect, type Page, test } from "@playwright/test"
import { BASE_URL } from "./base-url"
import { authorizePath } from "./oauth"
import { answerConsent, requestDeviceCode, signUp } from "./people"

/** Opens the Language menu and takes the other language's link, as a person would. */
async function switchLanguage(page: Page, language: "en" | "th"): Promise<void> {
	await page.locator(".auth-header .header-menu-summary").click()
	await page.locator(`.auth-header a[hreflang="${language}"]`).click()
	await page.waitForLoadState("load")
}

test("the first question keeps ?next= across the language switch", async ({ page }) => {
	await signUp(page)
	await page.goto("/welcome/?next=%2Fth%2Faccount%2F")
	await expect(page.getByRole("checkbox")).toBeVisible()
	await switchLanguage(page, "th")
	await expect(page).toHaveURL(/\/th\/welcome\/\?next=%2Fth%2Faccount%2F/)
	await expect(page.getByRole("checkbox")).toBeVisible()
	await page.getByRole("button", { name: "ดำเนินการต่อ" }).click()
	await page.waitForURL(/\/th\/account\/$/)
	await expect(page.getByRole("heading", { name: "E2E Person" })).toBeVisible()
})

test("the device screen keeps its code across the language switch", async ({ page }) => {
	await signUp(page)
	await answerConsent(page)
	const code = await requestDeviceCode(page)
	await page.goto(`/device/?user_code=${encodeURIComponent(code.userCode)}`)
	await expect(page.getByText("traj data collector")).toBeVisible()
	await switchLanguage(page, "th")
	await expect(page).toHaveURL(new RegExp(`/th/device/\\?user_code=${code.userCode}`))
	// The Thai page looked the same code up: the app's name is back, in the Thai page.
	await expect(page.getByText("traj data collector")).toBeVisible()
	await expect(page.getByText("อนุมัติเฉพาะเมื่อรหัสนี้แสดงอยู่บนอุปกรณ์ของคุณเอง")).toBeVisible()
})

test("the consent page keeps its signed query across the language switch", async ({ page }) => {
	await signUp(page)
	await answerConsent(page)
	await page.goto(`${BASE_URL}${authorizePath("e2e-language")}`)
	await page.waitForURL(/\/consent\//)
	const search = new URL(page.url()).search
	await switchLanguage(page, "th")
	await expect(page).toHaveURL(new RegExp(`/th/consent/\\?${escapeForRegExp(search.slice(1))}`))
	// The Thai page still names the app, so the signed flow survived the switch intact.
	await expect(page.getByRole("heading", { name: /Trajectonomics data site/ })).toBeVisible()
	await expect(page.getByText("ดูชื่อ อีเมล และรูปโปรไฟล์ของคุณ")).toBeVisible()
})

/** The search string, escaped so a signature's `+` and `=` are not read as a pattern. */
function escapeForRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
