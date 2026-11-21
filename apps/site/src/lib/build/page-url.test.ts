import { describe, expect, it } from "bun:test"
import { pageUrl } from "./page-url"

describe("the URL a built page is served at", () => {
	it("turns a Language home's directory index into the path it is built at", () => {
		expect(pageUrl("th/index.html")).toBe("/th/")
	})

	it("turns the root document into the Site's one address", () => {
		expect(pageUrl("index.html")).toBe("/")
	})

	it("keeps a Not-found page's own file name", () => {
		expect(pageUrl("404.html")).toBe("/404.html")
		expect(pageUrl("th/404.html")).toBe("/th/404.html")
	})
})
