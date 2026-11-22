import { describe, expect, it } from "bun:test"
import { handleRequest } from "./handle-request"
import { type Asked, contentOf, fakeAssets, get } from "./testing/fake-assets"

describe("the Worker's answer from the Site's one address", () => {
	it("answers English when no choice and no signal names a Language", async () => {
		const response = await handleRequest(get("/"), fakeAssets())
		expect(response.status).toBe(200)
		expect(await contentOf(response)).toContain('lang="en"')
	})

	it("answers Thai when the browser asks for Thai", async () => {
		const asked: Asked[] = []
		const response = await handleRequest(get("/", { "accept-language": "th" }), fakeAssets(asked))
		expect(await contentOf(response)).toContain("ไทย")
		expect(asked.map((one) => one.path)).toEqual(["/th/"])
	})

	it("answers Thai for a request from Thailand that asks for nothing", async () => {
		const response = await handleRequest(get("/", { "cf-ipcountry": "TH" }), fakeAssets())
		expect(await contentOf(response)).toContain("ไทย")
	})

	it("answers Thai when the visitor stored the choice", async () => {
		const response = await handleRequest(get("/", { cookie: "traj_lang=th" }), fakeAssets())
		expect(await contentOf(response)).toContain("ไทย")
	})

	it("lets the stored choice beat the browser's Language", async () => {
		const response = await handleRequest(
			get("/", { cookie: "traj_lang=th", "accept-language": "en" }),
			fakeAssets(),
		)
		expect(await contentOf(response)).toContain("ไทย")
	})

	it("lets the browser's Language beat the country", async () => {
		const response = await handleRequest(
			get("/", { "accept-language": "en", "cf-ipcountry": "TH" }),
			fakeAssets(),
		)
		expect(await contentOf(response)).toContain('lang="en"')
	})

	it("ignores a stored value the Site does not speak", async () => {
		const response = await handleRequest(get("/", { cookie: "traj_lang=zz" }), fakeAssets())
		expect(await contentOf(response)).toContain('lang="en"')
	})

	it("answers English for a hostile stored value rather than passing it on", async () => {
		const response = await handleRequest(
			get("/", { cookie: "traj_lang=../../etc/passwd" }),
			fakeAssets(),
		)
		expect(await contentOf(response)).toContain('lang="en"')
	})

	it("reads the choice among other cookies", async () => {
		const response = await handleRequest(
			get("/", { cookie: "a=1; traj_lang=th; b=2" }),
			fakeAssets(),
		)
		expect(await contentOf(response)).toContain("ไทย")
	})

	it("names every signal the answer depends on", async () => {
		const response = await handleRequest(get("/"), fakeAssets())
		expect(response.headers.get("vary")).toBe("Cookie, Accept-Language, CF-IPCountry")
	})

	it("keeps the answer out of every shared cache, and asks the browser to revalidate", async () => {
		const response = await handleRequest(get("/"), fakeAssets())
		expect(response.headers.get("cache-control")).toBe("private, no-cache")
	})

	it("carries the ETag of the bytes it serves, not the root asset's", async () => {
		const response = await handleRequest(get("/", { "accept-language": "th" }), fakeAssets())
		expect(response.headers.get("etag")).toBe('"thai-home"')
	})

	it("sets no cookie on the address itself", async () => {
		const response = await handleRequest(get("/", { "accept-language": "th" }), fakeAssets())
		expect(response.headers.get("set-cookie")).toBeNull()
	})

	it("passes a 304 through with the cache contract the answer would have carried", async () => {
		const asked: Asked[] = []
		const response = await handleRequest(
			get("/", { "if-none-match": '"thai-home"', "accept-language": "th" }),
			fakeAssets(asked),
		)
		expect(asked[0]?.ifNoneMatch).toBe('"thai-home"')
		expect(response.status).toBe(304)
		expect(await contentOf(response)).toBe("")
		expect(response.headers.get("etag")).toBe('"thai-home"')
		expect(response.headers.get("vary")).toBe("Cookie, Accept-Language, CF-IPCountry")
		expect(response.headers.get("cache-control")).toBe("private, no-cache")
	})

	it("answers HEAD with the headers and no body", async () => {
		const response = await handleRequest(
			new Request("https://trajectonomics.com/", { method: "HEAD" }),
			fakeAssets(),
		)
		expect(response.status).toBe(200)
		expect(response.headers.get("vary")).toBe("Cookie, Accept-Language, CF-IPCountry")
		expect(await contentOf(response)).toBe("")
	})
})

describe("the Language menu's choice link", () => {
	it("stores Thai and returns to the address with no shared cache", async () => {
		const response = await handleRequest(get("/?lang=th"), fakeAssets())
		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/")
		expect(response.headers.get("cache-control")).toBe("no-store")
		expect(response.headers.get("set-cookie")).toBe(
			"traj_lang=th; Path=/; Secure; SameSite=Lax; Max-Age=31536000",
		)
	})

	it("stores English too, so a visitor can leave Thai", async () => {
		const response = await handleRequest(get("/?lang=en"), fakeAssets())
		expect(response.headers.get("set-cookie")).toStartWith("traj_lang=en;")
	})

	it("writes no cookie for a Language the Site does not speak", async () => {
		const response = await handleRequest(get("/?lang=zz"), fakeAssets())
		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/")
		expect(response.headers.get("set-cookie")).toBeNull()
		expect(response.headers.get("cache-control")).toBe("no-store")
	})

	it("writes no cookie for an empty choice", async () => {
		const response = await handleRequest(get("/?lang="), fakeAssets())
		expect(response.status).toBe(302)
		expect(response.headers.get("set-cookie")).toBeNull()
	})

	it("reads no asset, because the choice answer is the whole response", async () => {
		const asked: Asked[] = []
		await handleRequest(get("/?lang=th"), fakeAssets(asked))
		expect(asked).toEqual([])
	})
})

describe("the addresses the Site used to answer at", () => {
	for (const path of ["/en", "/en/", "/en/anything", "/th", "/th/", "/th/anything"]) {
		it(`answers ${path} with a permanent redirect to the address`, async () => {
			const response = await handleRequest(get(path), fakeAssets())
			expect(response.status).toBe(301)
			expect(response.headers.get("location")).toBe("/")
		})
	}

	it("answers no prefix for a path that merely begins with one", async () => {
		for (const path of ["/english", "/theme"]) {
			const response = await handleRequest(get(path), fakeAssets())
			expect(response.status).toBe(404)
		}
	})

	it("hands a deeper path to the assets binding, which answers the one 404", async () => {
		const asked: Asked[] = []
		const response = await handleRequest(get("/no-such-page"), fakeAssets(asked))
		expect(response.status).toBe(404)
		expect(asked.map((one) => one.path)).toEqual(["/no-such-page"])
	})

	it("hands a crawler file to the assets binding unchanged", async () => {
		const response = await handleRequest(get("/sitemap.xml"), fakeAssets())
		expect(response.status).toBe(200)
		expect(response.headers.get("vary")).toBeNull()
		expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate")
	})
})
