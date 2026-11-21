import { describe, expect, test } from "bun:test"
import { stageOne } from "./fixtures.test-support"
import { leafOf, READ_LEAVES } from "./leaves"
import { checkParams, type PlanInput } from "./params"
import { planStageOne } from "./stage-one"
import { planStageTwo } from "./stage-two"

const base: PlanInput = {
	asOf: "2026-10-31",
	horizon: "2060-12-31",
	scenarios: [],
	compare: null,
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: false,
}

/** Every combination of the optional flags, each planned for both stages. */
const combinations: Partial<PlanInput>[] = [
	{},
	{ monthly: true },
	{ carryIn: true },
	{ compare: { a: "base", b: "retire-early" }, birthDate: "1990-05-15", ages: [45, 60] },
	{ compare: { a: "base", b: "retire-early" }, carryIn: true, monthly: true },
	{ scenarios: ["retire-early"], compare: { a: "base", b: "retire-early" } },
]

function allArgvs(overrides: Partial<PlanInput>): string[][] {
	const result = checkParams({ ...base, ...overrides })
	if (!result.ok) throw new Error(`fixture parameters must hold: ${result.error.code}`)
	const one = stageOne("2026-10-31", ["base", "retire-early"])
	const two = planStageTwo(result.params, one)
	const first = Object.values(planStageOne(result.params)).map((read) => read.argv)
	const reads = [
		two.doctor,
		two.balance,
		two.pnl,
		two.transactions,
		two.baseline,
		...two.netWorthHistory,
	]
	const rest = [...Object.values(two.projections), ...Object.values(two.fi), two.compare]
	return [
		...first,
		...reads.map((read) => read.argv),
		...rest.flatMap((read) => (read === null ? [] : [read.argv])),
	]
}

describe("every argv the Plan emits", () => {
	test("starts with an allowlisted read leaf and ends with --json, under every combination", () => {
		for (const overrides of combinations) {
			for (const argv of allArgvs(overrides)) {
				expect(leafOf(argv)).not.toBeNull()
				expect(argv.at(-1)).toBe("--json")
			}
		}
	})

	test("never names a write leaf, and every leaf it names is on the allowlist", () => {
		for (const overrides of combinations) {
			const leaves = allArgvs(overrides).map((argv) => leafOf(argv))
			for (const leaf of leaves) expect(READ_LEAVES as readonly (string | null)[]).toContain(leaf)
		}
	})
})
