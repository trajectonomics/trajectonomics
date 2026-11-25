import { describe, expect, test } from "bun:test"
import { estateLine } from "../../contract"
import { lineWords } from "./words"

const name = (id: string) => id

describe("an estate line in words", () => {
	test("words a rounding the page knows", () => {
		const line = estateLine.parse({ id: "tax", of: "gross", bps: "1.00", rounding: "floor" })
		expect(lineWords(line, name).words).toBe("1.00% of everything owned, rounded down")
	})

	test("shows a rounding the page does not know as the CLI states it", () => {
		const line = estateLine.parse({ id: "tax", of: "gross", bps: "1.00", rounding: "banker" })
		expect(lineWords(line, name).words).toBe("1.00% of everything owned, banker")
	})
})
