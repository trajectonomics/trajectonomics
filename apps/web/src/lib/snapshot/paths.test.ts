import { describe, expect, test } from "bun:test"
import type { ProjectionChance, Read } from "../contract"
import { chanceWithOutcomes, pathFixture } from "../view/chance/futures.test-support"
import { leafOf } from "./leaves"
import { checkParams } from "./params"
import { pathAnswer, pathKey, pathRead, pathRequest, representativeIndexes, sameRun } from "./paths"

const checked = checkParams({
	asOf: "2026-10-31",
	horizon: "2060-12-31",
	scenarios: [],
	compare: null,
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: false,
	returnModel: "model.json",
	paths: 200,
	seed: "0123456789abcdef",
})
if (!checked.ok) throw new Error(checked.error.message)
const params = checked.params

const read = (data: ProjectionChance): Read<ProjectionChance> => ({ argv: [], ok: true, data })

describe("pathRead", () => {
	test("is a projection path with the chance's own flags and the index, one token each", () => {
		const planned = pathRead(params, "base", 7)
		expect(planned?.argv).toEqual([
			"projection",
			"path",
			"--scenario=base",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--return-model=model.json",
			"--paths=200",
			"--seed=0123456789abcdef",
			"--index=7",
			"--json",
		])
		expect(planned && leafOf(planned.argv)).toBe("projection path")
		expect(planned?.carryInFor).toEqual([])
	})

	test("a plan name that starts with a dash stays inside its own token, and the Carry-in goes on standard input", () => {
		const planned = pathRead({ ...params, carryIn: true }, "--help", 1)
		expect(planned?.argv).toContain("--scenario=--help")
		expect(planned?.argv).toContain("--carry-in")
		expect(planned?.carryInFor).toEqual(["--help"])
	})

	test("is null when no chance inputs are stated", () => {
		expect(pathRead({ ...params, chance: null }, "base", 0)).toBeNull()
	})
})

describe("representativeIndexes", () => {
	test("is the five picks, each once, in the CLI's order", () => {
		expect(representativeIndexes(read(chanceWithOutcomes()))).toEqual([4, 0, 3, 2])
	})

	test("is none for a failed read, or one made without --outcomes", () => {
		expect(representativeIndexes(undefined)).toEqual([])
		expect(
			representativeIndexes({
				argv: [],
				ok: false,
				error: { code: "x", exitCode: 1, message: "x" },
			}),
		).toEqual([])
		expect(
			representativeIndexes(read({ ...chanceWithOutcomes(), representative: undefined })),
		).toEqual([])
	})

	test("leaves out the earliest run-out when none ran out", () => {
		const none = chanceWithOutcomes({
			representative: { p10: 1, p50: 2, p90: 3, earliestRunsOut: null, lowest: 4 },
		})
		expect(representativeIndexes(read(none))).toEqual([1, 2, 3, 4])
	})
})

describe("the path request", () => {
	test("takes a plan the Dashboard may send and an index in 0 to 9999", () => {
		expect(pathRequest.safeParse({ plan: "base", index: 0 }).success).toBe(true)
		expect(pathRequest.safeParse({ plan: "base", index: 9999 }).success).toBe(true)
		expect(pathKey(12)).toBe("12")
	})

	test.each([
		["a plan that starts with a dash", { plan: "--help", index: 1 }],
		["an empty plan", { plan: "", index: 1 }],
		["a plan with a line break", { plan: "a\nb", index: 1 }],
		["a negative index", { plan: "base", index: -1 }],
		["an index of 10000", { plan: "base", index: 10000 }],
		["a fractional index", { plan: "base", index: 1.5 }],
		["an index as text", { plan: "base", index: "1" }],
		["another field", { plan: "base", index: 1, extra: true }],
	])("refuses %s", (_name, body) => {
		expect(pathRequest.safeParse(body).success).toBe(false)
	})
})

describe("sameRun", () => {
	const chance = chanceWithOutcomes()

	test("holds for a replay of the same model, seed, paths, plan content and dates", () => {
		expect(sameRun(chance, pathFixture(1))).toBe(true)
	})

	test.each([
		["model", { definition: { ...chanceWithOutcomes().definition, modelId: "other" } }],
		["seed", { definition: { ...chanceWithOutcomes().definition, seed: "ffffffffffffffff" } }],
		["paths", { definition: { ...chanceWithOutcomes().definition, paths: 7 } }],
		[
			"plan content",
			{ scenario: { ...chanceWithOutcomes().scenario, effectiveContentHash: "jcs1:sha256:z" } },
		],
		["As-of", { asOf: "2026-11-30" }],
		["horizon", { horizon: "2030-12-31" }],
	])("fails when the %s differs", (_name, patch) => {
		expect(sameRun(chance, pathFixture(1, patch))).toBe(false)
	})
})

describe("the path answer", () => {
	test("takes a read of the path, or a refusal, and nothing else", () => {
		const ok = { ok: true, path: { argv: ["projection"], ok: true, data: pathFixture(1) } }
		expect(pathAnswer.safeParse(ok).success).toBe(true)
		const error = { code: "unknown_plan", exitCode: 1, message: "No." }
		expect(pathAnswer.safeParse({ ok: false, error }).success).toBe(true)
		expect(pathAnswer.safeParse({ ok: true, snapshot: {} }).success).toBe(false)
	})
})
