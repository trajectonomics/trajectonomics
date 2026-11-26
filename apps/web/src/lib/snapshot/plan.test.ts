import { describe, expect, test } from "bun:test"
import { stageOne } from "./fixtures.test-support"
import { DRY_RUN_LEAVES, leafOf, READ_LEAVES } from "./leaves"
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
	returnModel: null,
	paths: null,
	seed: null,
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
	const reads = [two.doctor, two.balance, two.pnl, two.transactions, two.baseline]
	const rest = [
		two.netWorthHistory,
		...Object.values(two.projections),
		...Object.values(two.fi),
		...Object.values(two.taxNotes),
		two.compare,
	]
	return [
		...first,
		...reads.map((read) => read.argv),
		...rest.flatMap((read) => (read === null ? [] : [read.argv])),
	]
}

/** The tokens before any `--`: the flags `traj` reads. */
function flagsOf(argv: readonly string[]): readonly string[] {
	const end = argv.indexOf("--")
	return end < 0 ? argv : argv.slice(0, end)
}

/** Asserts one argv starts with an allowlisted leaf, asks for JSON last, and dry-runs when its leaf does. */
function expectAllowed(argv: string[]): void {
	const leaf = leafOf(argv)
	const flags = flagsOf(argv)
	expect(leaf).not.toBeNull()
	expect(flags.at(-1)).toBe("--json")
	if (leaf !== null && (DRY_RUN_LEAVES as readonly string[]).includes(leaf)) {
		expect(flags).toContain("--dry-run")
	}
}

describe("every argv the Plan emits", () => {
	test("starts with an allowlisted read leaf and asks for JSON before any --, under every combination", () => {
		for (const overrides of combinations) {
			for (const argv of allArgvs(overrides)) expectAllowed(argv)
		}
	})

	test("never names a write leaf, and every leaf it names is on the allowlist", () => {
		const allowed = [...READ_LEAVES, ...DRY_RUN_LEAVES] as readonly (string | null)[]
		for (const overrides of combinations) {
			const leaves = allArgvs(overrides).map((argv) => leafOf(argv))
			for (const leaf of leaves) expect(allowed).toContain(leaf)
		}
	})

	test("does not take a scenario tax argv without --dry-run as a leaf", () => {
		expect(leafOf(["scenario", "tax", "--from-stored", "--json", "--", "base"])).toBeNull()
	})
})

describe("a Scenario name that looks like a flag", () => {
	test("is never a token of its own, so traj reads it as a name", () => {
		const names = { compare: { a: "--help", b: "-x" }, scenarios: ["--help"] }
		for (const argv of allArgvs(names)) {
			const flags = flagsOf(argv)
			expect(flags).not.toContain("--help")
			expect(flags).not.toContain("-x")
		}
	})
})
