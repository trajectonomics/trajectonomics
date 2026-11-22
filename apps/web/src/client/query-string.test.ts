import { describe, expect, test } from "bun:test"
import { paramOf, withParam } from "./query-string"

describe("the query string of a page", () => {
	test("reads one parameter, or the fallback when it is not set", () => {
		expect(paramOf("?scenario=early", "scenario", "base")).toBe("early")
		expect(paramOf("?demo=1", "scenario", "base")).toBe("base")
	})

	test("sets a parameter and keeps the others, and removes it when the value is empty", () => {
		expect(withParam("?demo=1", "scenario", "early")).toBe("?demo=1&scenario=early")
		expect(withParam("?demo=1&scenario=early", "scenario", "")).toBe("?demo=1")
		expect(withParam("?scenario=early", "scenario", "")).toBe("")
	})
})
