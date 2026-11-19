import { describe, expect, it } from "bun:test"
import { pageUrl } from "./page-url"

describe("the URL a built page is served at", () => {
	it("turns a Language home's directory index into its Locale URL", () => {
		expect(pageUrl("th/index.html")).toBe("/th/")
		expect(pageUrl("en/index.html")).toBe("/en/")
	})

	it("turns the root document into /, which the Worker redirects", () => {
		expect(pageUrl("index.html")).toBe("/")
	})

	it("keeps a Not-found page's own file name, under its Locale URL when it has one", () => {
		expect(pageUrl("404.html")).toBe("/404.html")
		expect(pageUrl("th/404.html")).toBe("/th/404.html")
	})
})
