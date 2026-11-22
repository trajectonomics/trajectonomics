import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { problems } from "../engine/test-helpers"
import type { ProjectionProblem } from "../types"
import { ERROR_CODES, type ErrorCode } from "./codes"

/** `true` only when `A` and `B` are the same union. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const everyReturnedCodeIsListed: Same<ProjectionProblem["code"], ErrorCode> = true

const src = new URL("../", import.meta.url)

/** Every upper-snake string literal the engine's own source writes, bar the list itself. */
function writtenLiterals(): Set<string> {
	const found = new Set<string>()
	for (const file of readdirSync(src, { recursive: true }) as string[]) {
		if (!file.endsWith(".ts") || file.endsWith(".test.ts") || file === "check/codes.ts") continue
		const text = readFileSync(new URL(file, src), "utf8")
		for (const match of text.matchAll(/"([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)"/g))
			found.add(match[1] ?? "")
	}
	return found
}

describe("ERROR_CODES is the set of codes the package returns", () => {
	it("types a Projection problem's code as exactly the listed codes", () => {
		expect(everyReturnedCodeIsListed).toBe(true)
	})

	it("lists a run-time problem's code", () => {
		const found = problems({
			accounts: [{ id: "savings", kind: "asset", rate: 1200, compounding: "monthly" }],
			balances: { savings: 8_950_000_000_000_000 },
			surplus: [{ account: "savings" }],
			start: "2025-12-31",
			horizon: "2026-03-31",
			resolution: "month",
		})
		expect(found.map((problem) => problem.code)).toEqual(["VALUE_OVERFLOW"])
		expect(ERROR_CODES).toContain("VALUE_OVERFLOW")
	})

	it("lists every code the source writes, and writes every code it lists", () => {
		expect([...writtenLiterals()].sort()).toEqual([...ERROR_CODES].sort())
	})
})
