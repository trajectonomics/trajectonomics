import { describe, expect, it } from "bun:test"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { chanceOfSuccess } from "../index"
import type { ChanceOfSuccessOptions, ReturnModel } from "../types"

const FULL = 4294967296

const model: ReturnModel = {
	id: "flat",
	accounts: ["cash"],
	buckets: [{ returnsBps: [0], weight: FULL }],
}

const fixture: Fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 1000 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	horizon: "2026-06-01",
	resolution: "month",
})

const valid: ChanceOfSuccessOptions = { model, seed: "0000000000000000", paths: 1 }

function codesOf(options: unknown, timeline = fixture.timeline, scenario = fixture.scenario) {
	const result = chanceOfSuccess(
		fixture.baseline,
		scenario,
		timeline,
		options as ChanceOfSuccessOptions,
	)
	if (result.ok) throw new Error("expected problems")
	return result.problems.map((problem) => [
		problem.code,
		"path" in problem ? problem.path : undefined,
	])
}

describe("chanceOfSuccess validation", () => {
	it("accepts the valid options and reports them as an ok result", () => {
		expect(chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, valid).ok).toBe(
			true,
		)
	})

	it.each([
		["zero paths", 0, "INVALID_PATH_COUNT"],
		["more than 10,000 paths", 10001, "INVALID_PATH_COUNT"],
	] as const)("refuses %s with %s", (_name, paths, code) => {
		expect(codesOf({ ...valid, paths })).toEqual([[code, ["options", "paths"]]])
	})

	it("refuses a fractional path count as not a safe integer", () => {
		expect(codesOf({ ...valid, paths: 1.5 })).toEqual([["NOT_SAFE_INTEGER", ["options", "paths"]]])
	})

	it("refuses an upper-case seed", () => {
		expect(codesOf({ ...valid, seed: "ABCDEF0123456789" })).toEqual([
			["INVALID_SEED", ["options", "seed"]],
		])
	})

	it("refuses a seed of fifteen hex digits", () => {
		expect(codesOf({ ...valid, seed: "000000000000000" })).toEqual([
			["INVALID_SEED", ["options", "seed"]],
		])
	})

	it("refuses options that are not an object", () => {
		expect(codesOf(undefined)).toEqual([["NOT_AN_OBJECT", ["options"]]])
	})

	it("refuses a missing Return model", () => {
		expect(codesOf({ seed: valid.seed, paths: 1 })).toEqual([["MISSING_KEY", ["model"]]])
	})

	it("refuses a model that names an Account the Scenario does not declare", () => {
		const stray = { ...model, accounts: ["brokerage"] }
		expect(codesOf({ ...valid, model: stray })).toEqual([
			["UNKNOWN_ACCOUNT", ["model", "accounts", 0]],
		])
	})

	it("refuses weights that do not total 2^32", () => {
		const short = { ...model, buckets: [{ returnsBps: [0], weight: 5 }] }
		expect(codesOf({ ...valid, model: short }).map(([code]) => code)).toEqual([
			"RETURN_WEIGHT_TOTAL",
		])
	})

	it("refuses a Timeline whose Market rows exceed the 1,200 row cap", () => {
		const long = { ...fixture.timeline, start: "2000-01-01", horizon: "2200-01-01" }
		expect(codesOf(valid, long).map(([code]) => code)).toEqual(["TOO_MANY_ENTRIES"])
	})

	it("returns a bad Baseline as problems instead of throwing", () => {
		const result = chanceOfSuccess(
			{ ...fixture.baseline, schemaVersion: 2 } as unknown as typeof fixture.baseline,
			fixture.scenario,
			fixture.timeline,
			valid,
		)
		expect(result).toEqual({
			ok: false,
			problems: [{ code: "UNSUPPORTED_SCHEMA_VERSION", path: ["baseline", "schemaVersion"] }],
		})
	})
})
