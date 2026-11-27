import { describe, expect, test } from "bun:test"
import { tickText } from "./tick-label"

describe("tickText", () => {
	test("writes a dollar tick without trailing zeros", () => {
		expect(tickText("usd", 2)).toBe("$2")
		expect(tickText("usd", 0.075)).toBe("$0.075")
	})

	test("writes a percentage tick", () => {
		expect(tickText("percent", 50)).toBe("50%")
		expect(tickText("percent", 12.5)).toBe("12.5%")
	})

	test("writes a compact token count", () => {
		expect(tickText("tokens", 86_000_000)).toBe("86M")
	})
})
