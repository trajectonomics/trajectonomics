import { describe, expect, test } from "bun:test"
import { pageTitle } from "./routes"
import { documentTitle, errorTitle } from "./titles"

describe("the title of the document", () => {
	test("names the page's heading and the product the page belongs to", () => {
		expect(documentTitle("Net worth")).toBe("Net worth · Trajectonomics")
		expect(documentTitle(pageTitle("/net-worth/"))).toBe("Net worth · Trajectonomics")
	})

	test("names an error page by its status", () => {
		expect(errorTitle(404)).toBe("Page not found")
		expect(errorTitle(500)).toBe("Something went wrong")
		expect(errorTitle(503)).toBe("Something went wrong")
	})
})
