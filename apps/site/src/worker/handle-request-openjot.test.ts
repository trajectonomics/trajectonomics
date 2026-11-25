import { describe, expect, it } from "bun:test"
import { handleRequest } from "./handle-request"
import { type Asked, contentOf, fakeAssets, get } from "./testing/fake-assets"

describe("the Worker's answer at OpenJot's address", () => {
	it("answers English at /openjot/ when no choice and no signal names a Language", async () => {
		const asked: Asked[] = []
		const response = await handleRequest(get("/openjot/"), fakeAssets(asked))
		expect(response.status).toBe(200)
		expect(await contentOf(response)).toContain("OpenJot English")
		expect(asked.map((one) => one.path)).toEqual(["/openjot/"])
	})

	it("answers Thai from the stored choice, out of the Thai build path", async () => {
		const asked: Asked[] = []
		const response = await handleRequest(
			get("/openjot/", { cookie: "traj_lang=th" }),
			fakeAssets(asked),
		)
		expect(await contentOf(response)).toContain("OpenJot ไทย")
		expect(asked.map((one) => one.path)).toEqual(["/th/openjot/"])
	})

	it("names every signal the answer depends on, and stays out of every shared cache", async () => {
		const response = await handleRequest(get("/openjot/"), fakeAssets())
		expect(response.headers.get("vary")).toBe("Cookie, Accept-Language, CF-IPCountry, Sec-GPC, DNT")
		expect(response.headers.get("cache-control")).toBe("private, no-cache")
	})

	it("carries the ETag of the OpenJot bytes it serves", async () => {
		const response = await handleRequest(get("/openjot/"), fakeAssets())
		expect(response.headers.get("etag")).toBe('"openjot-en"')
	})

	it("stores a Language chosen on /openjot/ and returns to /openjot/", async () => {
		const response = await handleRequest(get("/openjot/?lang=th"), fakeAssets())
		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/openjot/")
		expect(response.headers.get("set-cookie")).toStartWith("traj_lang=th;")
	})

	it("stores a consent answer chosen on /openjot/ and returns to /openjot/", async () => {
		const response = await handleRequest(
			get("/openjot/?consent=granted"),
			fakeAssets(),
			() => "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c",
		)
		expect(response.status).toBe(302)
		expect(response.headers.get("location")).toBe("/openjot/")
		expect(response.headers.get("set-cookie")).toContain("traj_consent=granted")
	})

	it("sends /openjot to /openjot/, keeping the query", async () => {
		const response = await handleRequest(get("/openjot?lang=th"), fakeAssets())
		expect(response.status).toBe(301)
		expect(response.headers.get("location")).toBe("/openjot/?lang=th")
	})
})
