import { describe, expect, test } from "bun:test"
import { leafOf } from "../snapshot/leaves"
import type { PlanParams } from "../snapshot/params"
import { whatIfReads } from "./argv"
import type { WhatIfBody } from "./overrides"

const PARAMS: PlanParams = {
	asOf: "2026-10-31",
	horizon: "2060-12-31",
	scenarios: ["base"],
	compare: null,
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: false,
	chance: null,
	allowances: null,
	futures: true,
}

const WHAT_IF: WhatIfBody = {
	plan: "base",
	sets: [{ path: "flows.salary.amount", value: "90000.50" }],
	removals: ["flows.gym"],
	additions: [],
}

describe("the reads of a what-if", () => {
	test("projection run, fi and compare take the removal and the Set, with --decimal, and write nothing", () => {
		const reads = whatIfReads(PARAMS, WHAT_IF)
		expect(reads.projection.argv).toEqual([
			"projection",
			"run",
			"--scenario=base",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--breakdown",
			"--spending",
			"--estate",
			"--without=flows.gym",
			'--set=flows.salary.amount="90000.50"',
			"--decimal",
			"--json",
		])
		expect(reads.fi.argv).toEqual([
			"fi",
			"--scenario=base",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--without=flows.gym",
			'--set=flows.salary.amount="90000.50"',
			"--decimal",
			"--json",
		])
		expect(reads.compare.argv).toEqual([
			"projection",
			"compare",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--without=flows.gym",
			'--set=flows.salary.amount="90000.50"',
			"--decimal",
			"--json",
			"--",
			"base",
		])
		expect(reads.chance).toBeNull()
	})

	test("only the projection takes --breakdown, so the Cash flow page can show the session's lines and totals", () => {
		const reads = whatIfReads({ ...PARAMS, monthly: true }, WHAT_IF)
		expect(reads.projection.argv).toContain("--breakdown")
		expect(reads.projection.argv.indexOf("--breakdown")).toBeLessThan(
			reads.projection.argv.indexOf("--decimal"),
		)
		for (const other of [reads.fi, reads.compare]) expect(other.argv).not.toContain("--breakdown")
	})

	test("every read is a read leaf of the Snapshot allowlist", () => {
		const reads = whatIfReads(
			{ ...PARAMS, chance: { returnModel: "m.json", paths: 10, seed: "0123456789abcdef" } },
			WHAT_IF,
		)
		for (const planned of [reads.projection, reads.fi, reads.compare, reads.chance]) {
			if (planned === null) throw new Error("chance is set")
			expect(leafOf(planned.argv)).not.toBeNull()
		}
	})

	test("a value with = in it is one --set token, and a plan with a leading space is one --scenario token", () => {
		const reads = whatIfReads(PARAMS, {
			plan: " early",
			sets: [{ path: "flows.a.name", value: "x=y" }],
			removals: [],
			additions: [],
		})
		expect(reads.projection.argv).toContain('--set=flows.a.name="x=y"')
		expect(reads.projection.argv).toContain("--scenario= early")
		expect(reads.compare.argv.slice(-2)).toEqual(["--", " early"])
	})

	test("the Carry-in is passed to each read for the plan, when the Plan states one", () => {
		const reads = whatIfReads({ ...PARAMS, carryIn: true }, WHAT_IF)
		expect(reads.projection.argv).toContain("--carry-in")
		expect(reads.projection.carryInFor).toEqual(["base"])
		expect(reads.compare.carryInFor).toEqual(["base"])
	})

	test("chance is one more read when the Snapshot states a Return model", () => {
		const reads = whatIfReads(
			{ ...PARAMS, chance: { returnModel: "m.json", paths: 10, seed: "0123456789abcdef" } },
			WHAT_IF,
		)
		expect(reads.chance?.argv).toEqual([
			"projection",
			"chance",
			"--scenario=base",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--return-model=m.json",
			"--paths=10",
			"--seed=0123456789abcdef",
			"--without=flows.gym",
			'--set=flows.salary.amount="90000.50"',
			"--decimal",
			"--json",
		])
	})

	test("a what-if with no change reads the plan as it is, with no override flag but --decimal", () => {
		const reads = whatIfReads(PARAMS, { plan: "base", sets: [], removals: [], additions: [] })
		expect(reads.projection.argv).not.toContain("--without=flows.gym")
		expect(reads.projection.argv.filter((token) => token.startsWith("--set"))).toEqual([])
		expect(reads.projection.argv.at(-2)).toBe("--decimal")
	})
})
