import { expect, test } from "@playwright/test"
import { BASE_URL } from "./base-url"
import { authorizePath } from "./oauth"
import { requestDeviceCode } from "./people"
import {
	cancelAtGoogle,
	devSignIn,
	expectFailedSignInPage,
	FAILED,
	pressGoogle,
	signedOutPerson,
} from "./social"

test("a cancelled social sign-in keeps the signed query, and a retry reaches consent", async ({
	page,
}) => {
	const user = await signedOutPerson(page)
	await cancelAtGoogle(page)
	await page.goto(authorizePath("e2e-cancel"))
	await page.waitForURL(/\/sign-in\/\?/)
	const signature = new URL(page.url()).searchParams.get("sig")
	expect(signature).not.toBeNull()

	await pressGoogle(page)
	const back = await expectFailedSignInPage(page)
	expect(back.searchParams.get("sig")).toBe(signature)
	expect(back.searchParams.get("state")).toBe("e2e-cancel")

	// The retry's own request still carries the signed flow, and one error marker, not a pile.
	const retry = await pressGoogle(page)
	const target = new URL(retry.errorCallbackURL ?? "", BASE_URL)
	expect(target.searchParams.getAll("error")).toEqual(["1"])
	expect(new URLSearchParams(retry.oauth_query).get("sig")).toBe(signature)
	await expectFailedSignInPage(page)

	const resumed = await devSignIn(page, user, retry.oauth_query)
	await page.goto(resumed)
	await page.waitForURL(/\/consent\//)
	await expect(page.getByRole("heading", { name: /Trajectonomics data site/ })).toBeVisible()
})

test("a cancelled social sign-in keeps ?next=, and a retry reaches the device page", async ({
	page,
}) => {
	const user = await signedOutPerson(page)
	const code = await requestDeviceCode(page)
	const next = `/device/?user_code=${encodeURIComponent(code.userCode)}`
	await cancelAtGoogle(page)
	await page.goto(`/sign-in/?next=${encodeURIComponent(next)}`)

	await pressGoogle(page)
	const back = await expectFailedSignInPage(page)
	expect(back.searchParams.get("next")).toBe(next)

	const retry = await pressGoogle(page)
	expect(retry.callbackURL).toBe(next)
	await expectFailedSignInPage(page)

	await devSignIn(page, user)
	await page.goto(retry.callbackURL ?? "")
	await page.waitForURL(/\/device\//)
	await expect(page.locator(".device-code")).toHaveText(
		code.userCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
	)
})

for (const [root, signIn, words] of [
	["/", "/sign-in/", FAILED],
	["/th/", "/th/sign-in/", "การเข้าสู่ระบบถูกยกเลิกหรือไม่สำเร็จ ลองอีกครั้ง"],
] as const) {
	test(`${root}?error= forwards to the sign-in page that says so`, async ({ page }) => {
		await page.goto(`${root}?error=state_mismatch`)
		await page.waitForURL(`${BASE_URL}${signIn}?error=1`)
		await expect(page.getByRole("alert")).toHaveText(words)
	})
}
