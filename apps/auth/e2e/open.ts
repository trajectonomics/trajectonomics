import type { Page } from "@playwright/test"
import type { Language } from "../src/lib/language"
import { BASE_URL } from "./base-url"
import { authorizePath } from "./oauth"
import { answerConsent, requestDeviceCode, signUp } from "./people"

/** The pages a browser check judges, and what each one needs set up first. */
export type ReviewTarget =
	| "sign-in"
	| "welcome"
	| "device"
	| "consent"
	| "account"
	| "privacy"
	| "terms"

const PATHS: Readonly<Record<ReviewTarget, string>> = {
	"sign-in": "/sign-in/",
	welcome: "/welcome/",
	device: "/device/",
	consent: "/consent/",
	account: "/account/",
	privacy: "/privacy/",
	terms: "/terms/",
}

/** The Google button's visible words, so the check waits for the control a person sees. */
function googleLabel(language: Language): string {
	return language === "en" ? "Continue with Google" : "ดำเนินการต่อด้วย Google"
}

function pageUrl(language: Language, target: ReviewTarget): string {
	return `${BASE_URL}${language === "th" ? "/th" : ""}${PATHS[target]}`
}

/** Signs in, answers the first question, and opens the page in the state a person would see. */
export async function openForReview(
	page: Page,
	target: ReviewTarget,
	language: Language,
): Promise<void> {
	if (target === "sign-in" || target === "privacy" || target === "terms") {
		await page.goto(pageUrl(language, target))
		await page.locator("h1").waitFor()
		if (target === "sign-in") {
			await page.getByRole("button", { name: googleLabel(language) }).waitFor()
		}
		return
	}
	await signUp(page)
	if (target === "welcome") return openWelcome(page, language)
	await answerConsent(page)
	if (target === "device") return openDevice(page, language)
	if (target === "consent") return openConsent(page, language)
	await page.goto(pageUrl(language, target))
	await page.getByRole("heading", { name: "E2E Person" }).waitFor()
	await page.getByRole("switch").waitFor()
}

async function openWelcome(page: Page, language: Language): Promise<void> {
	await page.goto(pageUrl(language, "welcome"))
	await page.getByRole("checkbox").waitFor()
}

async function openDevice(page: Page, language: Language): Promise<void> {
	const code = await requestDeviceCode(page)
	const query = `?user_code=${encodeURIComponent(code.userCode)}`
	await page.goto(`${pageUrl(language, "device")}${query}`)
	await page.getByText("traj data collector").waitFor()
}

async function openConsent(page: Page, language: Language): Promise<void> {
	await page.goto(`${BASE_URL}${authorizePath("e2e-review")}`)
	await page.waitForURL(/\/consent\//)
	if (language === "th") {
		const search = new URL(page.url()).search
		await page.goto(`${pageUrl(language, "consent")}${search}`)
	}
	await page.locator("h1").waitFor()
}
