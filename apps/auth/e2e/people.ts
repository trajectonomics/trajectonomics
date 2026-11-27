import { expect, type Page } from "@playwright/test"
import { DATA_AUDIENCE } from "../src/core/resources"
import { BASE_URL } from "./base-url"

/** The user one browser check signs up, and the password the dev-only gate accepts. */
export type TestUser = {
	readonly id: string
	readonly name: string
	readonly email: string
}

let counter = 0

/** A distinct loopback address per sign-up, so the 5/min rule counts each check on its own. */
function clientIp(): string {
	counter += 1
	return `127.0.0.${(counter % 250) + 1}`
}

/** Signs up through the dev-only email path; the response's cookie is now in the browser context. */
export async function signUp(page: Page): Promise<TestUser> {
	const ip = clientIp()
	// The page's own API calls carry this address too, so no check's lookups share a rate limit.
	await page.setExtraHTTPHeaders({ "cf-connecting-ip": ip })
	const email = `e2e-${Date.now()}-${counter}@example.test`
	const response = await page.request.post(`${BASE_URL}/api/auth/sign-up/email`, {
		data: { name: "E2E Person", email, password: "e2e-password-1234" },
		headers: { origin: BASE_URL, "cf-connecting-ip": ip },
	})
	const text = await response.text()
	expect(response.ok(), text).toBe(true)
	const body = JSON.parse(text) as { user: { id: string; name: string; email: string } }
	return { id: body.user.id, name: body.user.name, email: body.user.email }
}

/** Answers the first-sign-in question through the API, before a page that requires the answer. */
export async function answerConsent(page: Page, optedIn = false): Promise<void> {
	const response = await page.request.post(`${BASE_URL}/api/auth/marketing-consent`, {
		data: { optedIn, source: "first-sign-in" },
		headers: { origin: BASE_URL, "cf-connecting-ip": clientIp() },
	})
	expect(response.ok(), await response.text()).toBe(true)
}

/** The device code a person would read from the CLI, plus the interval the CLI advertises. */
export async function requestDeviceCode(
	page: Page,
): Promise<{ userCode: string; deviceCode: string; interval: number }> {
	const response = await page.request.post(`${BASE_URL}/api/auth/device/code`, {
		form: {
			client_id: "traj-data-collector",
			scope: "openid offline_access data:ingest",
			resource: DATA_AUDIENCE,
		},
		headers: { origin: BASE_URL, "cf-connecting-ip": clientIp() },
	})
	const text = await response.text()
	expect(response.ok(), text).toBe(true)
	const body = JSON.parse(text) as { user_code: string; device_code: string; interval: number }
	return { userCode: body.user_code, deviceCode: body.device_code, interval: body.interval }
}

/** The token poll the CLI makes with the device code it was given. */
export async function redeemDeviceCode(
	page: Page,
	deviceCode: string,
): Promise<{ access_token: string; refresh_token?: string }> {
	const response = await page.request.post(`${BASE_URL}/api/auth/oauth2/token`, {
		form: {
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			device_code: deviceCode,
			client_id: "traj-data-collector",
		},
		headers: { origin: BASE_URL, "cf-connecting-ip": clientIp() },
	})
	const text = await response.text()
	expect(response.ok(), text).toBe(true)
	return JSON.parse(text) as { access_token: string; refresh_token?: string }
}

/** The consent the API holds for the signed-in person. */
export async function consentState(
	page: Page,
): Promise<{ optedIn: boolean; source: string } | null> {
	const response = await page.request.get(`${BASE_URL}/api/auth/marketing-consent`, {
		headers: { origin: BASE_URL },
	})
	expect(response.ok()).toBe(true)
	const body = (await response.json()) as {
		consent: { optedIn: boolean; source: string } | null
	}
	return body.consent === null
		? null
		: { optedIn: body.consent.optedIn, source: body.consent.source }
}
