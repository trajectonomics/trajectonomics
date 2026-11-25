import { describe, expect, test } from "bun:test"
import { parseTerms } from "./terms"

describe("parseTerms", () => {
	test("reads the three terms the chart offers", () => {
		expect(parseTerms("nominal")).toBe("nominal")
		expect(parseTerms("real")).toBe("real")
		expect(parseTerms("both")).toBe("both")
	})

	test("shows both terms when the address bar names a term this page does not know", () => {
		expect(parseTerms("nominal-and-more")).toBe("both")
		expect(parseTerms("")).toBe("both")
	})
})
