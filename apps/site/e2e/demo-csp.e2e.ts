import { expect, type Page, test } from "@playwright/test"
import { BASE_URL } from "./base-url"

/**
 * The hosted Demo under the Content-Security-Policy the Site serves it with ([ADR 0031](../docs/adr/0031-the-site-serves-the-hosted-demo-with-a-scoped-csp.md)).
 * The Worker (`wrangler dev`) applies `_headers`, so these checks see the real policy: the header is
 * exact, the Demo still draws under it, nothing violates it, and nothing leaves the Site's own
 * `/demo/` path. The Site's own home keeps no policy.
 */
const DEMO_POLICY =
	"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'self'; frame-ancestors 'self'"

/**
 * The one violation the Demo reports on purpose. The validation library in the bundle probes
 * `Function("")` to choose its compiled path and falls back to its plain one when that throws, so
 * `script-src` blocks `eval` and the Demo works without it. The policy does not allow `'unsafe-eval'`
 * to silence the probe (ADR 0031). `frame-ancestors 'self'` lets the Site's own home frame the Demo
 * (ADR 0034).
 */
const EVAL_PROBE = "script-src blocked eval"

/** The Demo's home and pages that between them draw tables, forms, charts and the ledger. */
const DEMO_PAGES = ["/demo/", "/demo/net-worth/", "/demo/projection/", "/demo/ledger/"] as const

test("the Demo answers with exactly the scoped policy, and the Site's own home with none", async ({
	request,
}) => {
	const demo = await request.get("/demo/")
	expect(demo.status()).toBe(200)
	expect(demo.headers()["content-security-policy"]).toBe(DEMO_POLICY)

	const asset = await request.get("/demo/demo/snapshot.json")
	expect(asset.status()).toBe(200)
	expect(asset.headers()["content-security-policy"]).toBe(DEMO_POLICY)

	const home = await request.get("/", { maxRedirects: 0 })
	expect(home.headers()["content-security-policy"]).toBeUndefined()
})

/** Records every policy violation the page reports, from before its first script runs. */
async function recordViolations(page: Page): Promise<() => Promise<string[]>> {
	await page.addInitScript(() => {
		const seen: string[] = []
		;(window as unknown as { __violations: string[] }).__violations = seen
		document.addEventListener("securitypolicyviolation", (event) => {
			seen.push(`${event.violatedDirective} blocked ${event.blockedURI || "inline"}`)
		})
	})
	return () => page.evaluate(() => (window as unknown as { __violations: string[] }).__violations)
}

for (const path of DEMO_PAGES) {
	test(`${path} draws under the policy, breaks none of it and sends nothing out of /demo/`, async ({
		page,
	}) => {
		const violations = await recordViolations(page)
		const consoleErrors: string[] = []
		page.on("console", (message) => {
			if (message.type() === "error") consoleErrors.push(message.text())
		})
		const requests: { method: string; url: string; body: string | null }[] = []
		page.on("request", (request) =>
			requests.push({ method: request.method(), url: request.url(), body: request.postData() }),
		)

		await page.goto(path)
		await page.waitForLoadState("networkidle")
		await expect(page.getByText("Loading the Snapshot.")).toHaveCount(0)
		await expect(page.getByText("No Snapshot is loaded.")).toHaveCount(0)
		await expect(page.locator("main")).toBeVisible()

		expect((await violations()).filter((line) => line !== EVAL_PROBE)).toEqual([])
		expect(
			consoleErrors.filter(
				(text) => text.includes("Content Security Policy") && !text.includes("'unsafe-eval'"),
			),
		).toEqual([])
		const strays = requests.filter(({ method, url, body }) => {
			const { origin, pathname } = new URL(url)
			return (
				method !== "GET" || body !== null || origin !== BASE_URL || !pathname.startsWith("/demo/")
			)
		})
		expect(strays).toEqual([])
	})
}
