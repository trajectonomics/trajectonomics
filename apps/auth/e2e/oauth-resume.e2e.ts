import { expect, test } from "@playwright/test"
import { BASE_URL } from "./base-url"
import { authorizePath } from "./oauth"
import { answerConsent, signUp } from "./people"

/**
 * `prompt=login` and `max_age=0` ask for a fresh sign-in, and the provider answers the sign-in that
 * sets the session cookie with the next step of the flow — with the prompt already spent. The page
 * must follow that answer. Navigating back to the signed login link instead re-runs `prompt=login`
 * and loops; this is the passkey page's exact mechanism, driven with the dev-only password sign-in
 * so a browser check can prove it without a virtual authenticator.
 */
test("a sign-in carrying the signed query resumes prompt=login instead of looping", async ({
	page,
}) => {
	const user = await signUp(page)
	await answerConsent(page)
	await page.goto(`${BASE_URL}${authorizePath("e2e-prompt")}&prompt=login`)
	await page.waitForURL(/\/sign-in\/\?/)
	const loginPage = new URL(page.url())
	const oauthQuery = loginPage.search.slice(1)
	expect(loginPage.searchParams.get("prompt")).toBe("login")
	expect(loginPage.searchParams.get("sig")).not.toBeNull()

	// Exactly the body the passkey client sends: the WebAuthn answer plus the page's signed query.
	const response = await page.request.post(`${BASE_URL}/api/auth/sign-in/email`, {
		data: { email: user.email, password: "e2e-password-1234", oauth_query: oauthQuery },
		headers: { origin: BASE_URL },
	})
	const text = await response.text()
	expect(response.ok(), text).toBe(true)
	const body = JSON.parse(text) as { url?: string }
	// The provider resumed: the flow has moved on, and the prompt is not asked for a second time.
	expect(body.url, text).toBeTruthy()
	expect(body.url).not.toContain("prompt=login")
	expect(body.url).not.toContain("/sign-in")
})

test("max_age=0 also resumes after the sign-in that satisfies it", async ({ page }) => {
	const user = await signUp(page)
	await answerConsent(page)
	await page.goto(`${BASE_URL}${authorizePath("e2e-max-age")}&max_age=0`)
	await page.waitForURL(/\/sign-in\/\?/)
	const oauthQuery = new URL(page.url()).search.slice(1)

	const response = await page.request.post(`${BASE_URL}/api/auth/sign-in/email`, {
		data: { email: user.email, password: "e2e-password-1234", oauth_query: oauthQuery },
		headers: { origin: BASE_URL },
	})
	const text = await response.text()
	expect(response.ok(), text).toBe(true)
	const body = JSON.parse(text) as { url?: string }
	expect(body.url, text).toBeTruthy()
	expect(body.url).not.toContain("max_age")
	expect(body.url).not.toContain("/sign-in")
})
