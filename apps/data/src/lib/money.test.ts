import { describe, expect, test } from "bun:test"
import { usdLabel, usdTick } from "./money"

describe("usdLabel", () => {
	test("keeps the cents", () => {
		expect(usdLabel(2.4)).toBe("$2.40")
		expect(usdLabel(0.8)).toBe("$0.80")
	})

	test("groups a large figure", () => {
		expect(usdLabel(1200)).toBe("$1,200.00")
	})
})

describe("usdTick", () => {
	test("keeps a small figure's thousandths", () => {
		expect(usdTick(0.075)).toBe("$0.075")
	})

	test("drops trailing zeros", () => {
		expect(usdTick(100)).toBe("$100")
	})
})
