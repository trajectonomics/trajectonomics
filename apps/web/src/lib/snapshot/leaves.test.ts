import { describe, expect, test } from "bun:test"
import { DRY_RUN_LEAVES, leafOf, READ_LEAVES } from "./leaves"

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
			"baseline rates",
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

	test("the only dry-run leaf is scenario tax, which the Plan emits only with --dry-run", () => {
		expect([...DRY_RUN_LEAVES]).toEqual(["scenario tax"])
	})

	test("matches scenario tax only when --dry-run comes before any --", () => {
		expect(leafOf(["scenario", "tax", "--from-stored", "--dry-run", "--json"])).toBe("scenario tax")
		expect(leafOf(["scenario", "tax", "--from-stored", "--json", "--", "base"])).toBeNull()
		expect(leafOf(["scenario", "tax", "--from-stored", "--json", "--", "--dry-run"])).toBeNull()
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

	test("the viewing date's bare monthly run is the same leaf", () => {
		expect(leafOf(["projection", "run", "--scenario=base", "--monthly", "--json"])).toBe(
			"projection run",
		)
	})
})
