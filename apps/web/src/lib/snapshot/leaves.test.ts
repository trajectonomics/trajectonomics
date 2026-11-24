import { describe, expect, test } from "bun:test"
import { leafOf, READ_LEAVES } from "./leaves"

describe("the read-leaf allowlist", () => {
	test("is exactly the read leaves the Plan may emit, and no write leaf", () => {
		expect([...READ_LEAVES]).toEqual([
			"doctor",
			"account list",
			"balance",
			"report networth",
			"report pnl",
			"tx list",
			"baseline show",
			"scenario list",
			"scenario show",
			"projection run",
			"fi",
			"projection compare",
			"projection chance",
			"projection path",
			"projection allowances",
		])
		for (const write of ["tx add", "account add", "scenario apply", "scenario fork", "init"]) {
			expect(READ_LEAVES as readonly string[]).not.toContain(write)
		}
	})

	test("an argv is matched to the longest leaf it starts with, and a write argv to none", () => {
		expect(leafOf(["projection", "compare", "a", "b"])).toBe("projection compare")
		expect(leafOf(["fi", "--scenario", "base"])).toBe("fi")
		expect(leafOf(["tx", "add", "--from", "Cash"])).toBeNull()
		expect(leafOf(["projection"])).toBeNull()
	})

	test("the run the Cash flow page reads, with its breakdown, is still the projection run leaf", () => {
		expect(leafOf(["projection", "run", "--scenario=base", "--breakdown", "--json"])).toBe(
			"projection run",
		)
	})
})
