import { describe, expect, it } from "bun:test"
import type { Assets } from "./handle-request"
import { handleRequest } from "./handle-request"

/** An assets binding that names the path it was asked for, so a delegation is visible. */
const assets: Assets = {
	async fetch(request: Request): Promise<Response> {
		return new Response(`asset:${new URL(request.url).pathname}`, { status: 200 })
	},
}

function get(path: string, headers: Record<string, string> = {}): Request {
	return new Request(`https://trajectonomics.com${path}`, { headers })
}

function contentOf(response: Response): Promise<string> {
	return response.text()
}

describe("the Worker's answer from /", () => {
	it("redirects to Thai when the browser asks for Thai", async () => {
		const response = await handleRequest(get("/", { "accept-language": "th" }), assets)
		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/th/")
	})

	it("redirects to Thai for a request from Thailand that asks for nothing", async () => {
		const response = await handleRequest(get("/", { "cf-ipcountry": "TH" }), assets)
		expect(response.headers.get("location")).toBe("/th/")
	})

	it("redirects to English when no Visitor signal says otherwise", async () => {
		const response = await handleRequest(get("/"), assets)
		expect(response.headers.get("location")).toBe("/en/")
	})

	it("gives English to an English browser in Thailand", async () => {
		const response = await handleRequest(
			get("/", { "accept-language": "en", "cf-ipcountry": "TH" }),
			assets,
		)
		expect(response.headers.get("location")).toBe("/en/")
	})

	it("keeps the query string, so a campaign tag survives the hop", async () => {
		const response = await handleRequest(
			get("/?ref=share&x=1", { "accept-language": "th" }),
			assets,
		)
		expect(response.headers.get("location")).toBe("/th/?ref=share&x=1")
	})

	it("names the Visitor signals a shared cache must vary on", async () => {
		const response = await handleRequest(get("/"), assets)
		expect(response.headers.get("vary")).toBe("Accept-Language, CF-IPCountry")
	})

	it("may not be stored, because the next visitor may come from elsewhere", async () => {
		const response = await handleRequest(get("/"), assets)
		expect(response.headers.get("cache-control")).toBe("no-store")
	})

	it("sets no cookie", async () => {
		const response = await handleRequest(get("/"), assets)
		expect(response.headers.get("set-cookie")).toBeNull()
	})

	it("answers with an empty body, so no document lives at /", async () => {
		const response = await handleRequest(get("/"), assets)
		expect(await contentOf(response)).toBe("")
	})

	it("answers HEAD / with the same redirect", async () => {
		const response = await handleRequest(
			new Request("https://trajectonomics.com/", { method: "HEAD" }),
			assets,
		)
		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/en/")
	})

	it("chooses nothing for a Locale URL, which is served as a static asset", async () => {
		const response = await handleRequest(get("/th/", { "accept-language": "en" }), assets)
		expect(await contentOf(response)).toBe("asset:/th/")
	})

	it("hands an unknown path to the assets binding, which answers 404", async () => {
		const response = await handleRequest(get("/no-such-page"), assets)
		expect(await contentOf(response)).toBe("asset:/no-such-page")
	})
})
