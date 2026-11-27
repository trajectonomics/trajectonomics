import { expect, type Page, type Request } from "@playwright/test"
import { BASE_URL } from "./base-url"
import { answerConsent, signUp, type TestUser } from "./people"

/** The words the sign-in page shows after a cancelled or failed sign-in. */
export const FAILED = "Sign-in was cancelled or failed. Try again."

/** A person with an account and a consent answer, whose browser is signed out. */
export async function signedOutPerson(page: Page): Promise<TestUser> {
	const user = await signUp(page)
	await answerConsent(page)
	await page.context().clearCookies()
	return user
}

/**
 * Stands in for Google's page: the person cancels, and the browser goes to the real callback with
 * the real `state`, so the Worker itself decides where the failed sign-in returns.
 */
export async function cancelAtGoogle(page: Page): Promise<void> {
	await page.route("https://accounts.google.com/**", (route) => {
		const state = new URL(route.request().url()).searchParams.get("state") ?? ""
		const callback = new URL("/api/auth/callback/google", BASE_URL)
		callback.search = new URLSearchParams({ error: "access_denied", state }).toString()
		return route.fulfill({
			contentType: "text/html",
			body: `<!doctype html><script>location.replace(${JSON.stringify(callback.href)})</script>`,
		})
	})
}

export type SocialBody = { callbackURL?: string; errorCallbackURL?: string; oauth_query?: string }

/** Presses the Google button and gives back what the page's own client sent. */
export async function pressGoogle(page: Page): Promise<SocialBody> {
	const sent = page.waitForRequest((request: Request) =>
		request.url().endsWith("/api/auth/sign-in/social"),
	)
	await page.getByRole("button", { name: "Continue with Google" }).click()
	return (await sent).postDataJSON() as SocialBody
}

/** Waits until the cancelled sign-in is back on the sign-in page, saying so. */
export async function expectFailedSignInPage(page: Page): Promise<URL> {
	await page.waitForURL((url) => url.pathname === "/sign-in/" && url.searchParams.has("error"))
	await expect(page.getByRole("alert")).toHaveText(FAILED)
	return new URL(page.url())
}

/** The dev-only password sign-in, which stands for the retry that succeeds. */
export async function devSignIn(page: Page, user: TestUser, oauthQuery?: string): Promise<string> {
	const response = await page.request.post(`${BASE_URL}/api/auth/sign-in/email`, {
		data: {
			email: user.email,
			password: "e2e-password-1234",
			...(oauthQuery === undefined ? {} : { oauth_query: oauthQuery }),
		},
		headers: { origin: BASE_URL },
	})
	const text = await response.text()
	expect(response.ok(), text).toBe(true)
	return (JSON.parse(text) as { url?: string }).url ?? ""
}
