import { describe, expect, test } from "bun:test"
import { percentWords } from "./percent"

describe("percentWords", () => {
	test("drops the zeros after the point and the point itself, and nothing else", () => {
		expect(percentWords("5.00")).toBe("5")
		expect(percentWords("3.50")).toBe("3.5")
		expect(percentWords("1.25")).toBe("1.25")
		expect(percentWords("0.05")).toBe("0.05")
		expect(percentWords("10")).toBe("10")
		expect(percentWords("100.00")).toBe("100")
		expect(percentWords("0.00")).toBe("0")
	})
})
