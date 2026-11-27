import { expect, test } from "@playwright/test"
import { LANGUAGES, type Page, pagePath } from "../src/lib/language"
import { BASE_URL } from "./base-url"

/** Every page a person can open, signed in or not: the headers are the asset server's, not a page's. */
const PAGES: readonly Page[] = [
	"home",
	"sign-in",
	"welcome",
	"device",
	"consent",
	"account",
	"privacy",
	"terms",
]

const REQUIRED = {
	"x-frame-options": "DENY",
	"x-content-type-options": "nosniff",
	"referrer-policy": "no-referrer",
	"strict-transport-security": "max-age=63072000; includeSubDomains",
} as const

test("every page carries the frame, type, referrer and transport headers", async ({ request }) => {
	for (const language of LANGUAGES) {
		for (const page of PAGES) {
			const response = await request.get(pagePath(language, page))
			expect(response.status(), `${language} ${page}`).toBe(200)
			const headers = response.headers()
			for (const [name, value] of Object.entries(REQUIRED)) {
				expect(headers[name], `${language} ${page} sends ${name}`).toBe(value)
			}
			const policy = headers["content-security-policy"] ?? ""
			expect(policy, `${language} ${page} has a policy`).toContain("default-src 'self'")
			expect(policy, `${language} ${page} refuses framing`).toContain("frame-ancestors 'none'")
			expect(policy, `${language} ${page} refuses a base rewrite`).toContain("base-uri 'none'")
			expect(policy, `${language} ${page} refuses plugins`).toContain("object-src 'none'")
			expect(policy, `${language} ${page} posts only to itself`).toContain("form-action 'self'")
			expect(policy, `${language} ${page} shows avatars from Google and GitHub`).toContain(
				"img-src 'self' https: data:",
			)
			expect(policy, `${language} ${page} never allows an inline script by keyword`).not.toContain(
				"'unsafe-inline'",
			)
		}
	}
})

test("the Worker's own answers carry the frame and type rules", async ({ request }) => {
	const response = await request.get("/api/auth/ok")
	expect(response.status()).toBe(200)
	const headers = response.headers()
	expect(headers["x-frame-options"]).toBe("DENY")
	expect(headers["x-content-type-options"]).toBe("nosniff")
	expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'")
})

test("a page's policy allows exactly the scripts it carries", async ({ page }) => {
	// A blocked inline script would leave the theme on its fallback and log a violation, so the
	// theme attribute the inline script sets is the browser's own proof that the hash matched.
	const violations: string[] = []
	page.on("console", (message) => {
		if (/Content Security Policy/i.test(message.text())) violations.push(message.text())
	})
	await page.goto("/sign-in/")
	await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/)
	await page.getByRole("button", { name: "Continue with Google" }).waitFor()
	expect(violations).toEqual([])
})

test("a cross-origin page cannot frame the device screen", async ({ page }) => {
	await page.route("https://embed.example/**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "text/html",
			body: `<!doctype html><title>embed</title><iframe src="${BASE_URL}/device/" title="device"></iframe>`,
		}),
	)
	await page.goto("https://embed.example/")
	await page.waitForTimeout(500)
	// Chromium refuses the document: the subframe never navigates to the auth origin, so none of the
	// page's own words are reachable from the embedder.
	const framed = page.frames().filter((frame) => frame.url().startsWith(`${BASE_URL}/device/`))
	expect(framed).toEqual([])
	expect(await page.locator("iframe").count()).toBe(1)
	expect(await page.getByText("Connect a device").count()).toBe(0)
	expect(
		await page
			.locator("iframe")
			.evaluate((frame) => (frame as HTMLIFrameElement).contentWindow?.length ?? 0),
	).toBe(0)
})
