import { describe, expect, it } from "bun:test"
import { verificationMetas } from "./verification"

describe("the verification metas an indexed page carries", () => {
	it("carries none while the owner has supplied no token", () => {
		expect(verificationMetas({})).toEqual([])
	})

	it("carries Google's meta once, under the name Google Search Console reads", () => {
		expect(verificationMetas({ google: "google-token" })).toEqual([
			{ name: "google-site-verification", content: "google-token" },
		])
	})

	it("carries Bing's meta once, under the name Bing Webmaster Tools reads", () => {
		expect(verificationMetas({ bing: "bing-token" })).toEqual([
			{ name: "msvalidate.01", content: "bing-token" },
		])
	})

	it("carries one meta per engine when the owner supplies both tokens", () => {
		expect(verificationMetas({ google: "g", bing: "b" }).map((meta) => meta.name)).toEqual([
			"google-site-verification",
			"msvalidate.01",
		])
	})

	it("carries no meta for a blank token, which would verify nothing", () => {
		expect(verificationMetas({ google: "  ", bing: "" })).toEqual([])
	})

	it("hands the metas out frozen, so a caller cannot edit what the page states", () => {
		const metas = verificationMetas({ google: "g" })
		expect(Object.isFrozen(metas)).toBe(true)
		expect(Object.isFrozen(metas[0])).toBe(true)
	})
})
