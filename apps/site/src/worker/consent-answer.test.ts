import { describe, expect, it } from "bun:test"
import { handleRequest } from "./handle-request"
import { type Asked, contentOf, fakeAssets, get } from "./testing/fake-assets"

/** A visitor id the tests mint, so a test can name the id the Worker should have written. */
const MINTED = "11111111-2222-4333-8444-555555555555"
const EXISTING = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"

/** The id source a test passes: always the same minted id, so the expectations are fixed. */
const mint = () => MINTED

/** The `Set-Cookie` values a response carries. */
function setCookies(response: Response): readonly string[] {
	return response.headers.getSetCookie()
}

describe("the consent choice the Worker stores", () => {
	it("answers a grant with 302 back to the address, uncached, with both cookies", async () => {
		const response = await handleRequest(get("/?consent=granted"), fakeAssets(), mint)
		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/")
		expect(response.headers.get("cache-control")).toBe("no-store")
		expect(setCookies(response)).toEqual([
			"traj_consent=granted; Domain=trajectonomics.com; Path=/; Secure; SameSite=Lax; Max-Age=15552000",
			`traj_vid=${MINTED}; Domain=trajectonomics.com; Path=/; Secure; SameSite=Lax; Max-Age=15552000`,
		])
	})

	it("keeps the visitor's own valid id on a grant", async () => {
		const response = await handleRequest(
			get("/?consent=granted", { cookie: `traj_consent=granted; traj_vid=${EXISTING}` }),
			fakeAssets(),
			mint,
		)
		expect(setCookies(response)[1]).toBe(
			`traj_vid=${EXISTING}; Domain=trajectonomics.com; Path=/; Secure; SameSite=Lax; Max-Age=15552000`,
		)
	})

	it("mints a new id on a grant when the visitor's id is invalid", async () => {
		const response = await handleRequest(
			get("/?consent=granted", { cookie: "traj_vid=><script>" }),
			fakeAssets(),
			mint,
		)
		expect(setCookies(response)[1]).toContain(`traj_vid=${MINTED};`)
	})

	it("clears the id on a refusal", async () => {
		const response = await handleRequest(get("/?consent=denied"), fakeAssets(), mint)
		expect(response.status).toBe(302)
		expect(setCookies(response)).toEqual([
			"traj_consent=denied; Domain=trajectonomics.com; Path=/; Secure; SameSite=Lax; Max-Age=15552000",
			"traj_vid=; Domain=trajectonomics.com; Path=/; Secure; SameSite=Lax; Max-Age=0",
		])
	})

	it("clears both cookies on a reset", async () => {
		const response = await handleRequest(get("/?consent=reset"), fakeAssets(), mint)
		expect(setCookies(response)).toEqual([
			"traj_consent=; Domain=trajectonomics.com; Path=/; Secure; SameSite=Lax; Max-Age=0",
			"traj_vid=; Domain=trajectonomics.com; Path=/; Secure; SameSite=Lax; Max-Age=0",
		])
	})

	it("stores nothing for a value it does not know, and still returns to the address", async () => {
		const response = await handleRequest(get("/?consent=maybe"), fakeAssets(), mint)
		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/")
		expect(setCookies(response)).toEqual([])
	})
})

describe("the home for a visitor who has answered the banner", () => {
	it("keeps today's bytes and validators for a visitor who has not answered", async () => {
		const response = await handleRequest(get("/"), fakeAssets(), mint)
		expect(response.headers.get("etag")).toBe('"root-en"')
		expect(await contentOf(response)).toBe('<html lang="en">English</html>')
	})

	it("marks a granted home with the visitor's id, dropping the validators", async () => {
		const response = await handleRequest(
			get("/", { cookie: `traj_consent=granted; traj_vid=${EXISTING}` }),
			fakeAssets(),
			mint,
		)
		expect(await contentOf(response)).toBe(
			`<html lang="en" data-consent="granted" data-visitor="${EXISTING}">English</html>`,
		)
		expect(response.headers.get("etag")).toBeNull()
		expect(response.headers.get("last-modified")).toBeNull()
		expect(response.headers.get("vary")).toBe("Cookie, Accept-Language, CF-IPCountry, Sec-GPC, DNT")
		expect(response.headers.get("cache-control")).toBe("private, no-cache")
		expect(setCookies(response)).toEqual([])
	})

	it("mints the id for a granted home that has none, and stores it", async () => {
		const response = await handleRequest(
			get("/", { cookie: "traj_consent=granted" }),
			fakeAssets(),
			mint,
		)
		expect(await contentOf(response)).toContain(`data-visitor="${MINTED}"`)
		expect(setCookies(response)).toEqual([
			`traj_vid=${MINTED}; Domain=trajectonomics.com; Path=/; Secure; SameSite=Lax; Max-Age=15552000`,
		])
	})

	it("hides the banner from a refusal and writes no id into the page", async () => {
		const response = await handleRequest(
			get("/", { cookie: "traj_consent=denied" }),
			fakeAssets(),
			mint,
		)
		expect(await contentOf(response)).toBe('<html lang="en" data-consent="denied">English</html>')
		expect(setCookies(response)).toEqual([])
	})

	it("treats a browser opt-out as a refusal even with no cookie", async () => {
		const response = await handleRequest(get("/", { "sec-gpc": "1" }), fakeAssets(), mint)
		const body = await contentOf(response)
		expect(body).toContain('data-consent="denied"')
		expect(body).not.toContain("data-visitor")
	})

	it("never writes a hostile cookie value into the page", async () => {
		const response = await handleRequest(
			get("/", { cookie: 'traj_consent=granted; traj_vid="><script>alert(1)</script>' }),
			fakeAssets(),
			mint,
		)
		const body = await contentOf(response)
		expect(body).not.toContain("<script>alert")
		expect(body).toContain(`data-visitor="${MINTED}"`)
	})

	it("rewrites no body for a HEAD and keeps the answer's headers", async () => {
		const response = await handleRequest(
			new Request("https://trajectonomics.com/", {
				method: "HEAD",
				headers: { cookie: "traj_consent=denied" },
			}),
			fakeAssets(),
			mint,
		)
		expect(response.status).toBe(200)
		expect(await contentOf(response)).toBe("")
		expect(response.headers.get("vary")).toBe("Cookie, Accept-Language, CF-IPCountry, Sec-GPC, DNT")
	})
})

describe("the cookie domain the Worker names", () => {
	it("scopes the cookies to trajectonomics.com, so every app on the zone reads them", async () => {
		const response = await handleRequest(get("/?consent=denied"), fakeAssets(), mint)
		for (const cookie of setCookies(response))
			expect(cookie).toContain("Domain=trajectonomics.com;")
	})

	it("names no domain on a host outside it, which would refuse such a cookie", async () => {
		const request = new Request("https://site.example.workers.dev/?consent=granted")
		const response = await handleRequest(request, fakeAssets(), mint)
		expect(setCookies(response)).toEqual([
			"traj_consent=granted; Path=/; Secure; SameSite=Lax; Max-Age=15552000",
			`traj_vid=${MINTED}; Path=/; Secure; SameSite=Lax; Max-Age=15552000`,
		])
	})

	it("keeps the id of a visitor whose browser sends Sec-GPC", async () => {
		const response = await handleRequest(
			get("/?consent=granted", { cookie: `traj_vid=${EXISTING}`, "sec-gpc": "1" }),
			fakeAssets(),
			mint,
		)
		expect(setCookies(response)[1]).toStartWith(`traj_vid=${EXISTING};`)
	})
})

describe("a consent answer another site tries to give", () => {
	it("stores nothing for an embedded image or fetch, only for the visitor's own navigation", async () => {
		for (const dest of ["image", "empty", "iframe"]) {
			const response = await handleRequest(
				get("/?consent=granted", { "sec-fetch-dest": dest }),
				fakeAssets(),
				mint,
			)
			expect(response.status).toBe(302)
			expect(setCookies(response)).toEqual([])
		}
		const navigation = await handleRequest(
			get("/?consent=granted", { "sec-fetch-dest": "document" }),
			fakeAssets(),
			mint,
		)
		expect(setCookies(navigation)).toHaveLength(2)
	})
})

describe("a decided visitor's revalidation", () => {
	it("is answered with the full rewritten home, never a 304 of the variant with the banner", async () => {
		const asked: Asked[] = []
		const response = await handleRequest(
			get("/", { cookie: "traj_consent=denied", "if-none-match": '"root-en"' }),
			fakeAssets(asked),
			mint,
		)
		expect(asked[0]?.ifNoneMatch).toBeNull()
		expect(response.status).toBe(200)
		expect(await contentOf(response)).toContain('data-consent="denied"')
	})
})
