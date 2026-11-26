import { describe, expect, test } from "bun:test"
import type { ProjectionRun, ScenarioDocument } from "../contract"
import { filersOf, readForFilers } from "./allowance-filers"
import type { PlannedRead } from "./planned"

const READ: PlannedRead = {
	argv: [
		"projection",
		"allowances",
		"--scenario=base",
		"--labels",
		"allowance.retirement.rmf,allowance.thai_esg",
		"--step",
		"1000",
		"--json",
	],
	carryInFor: ["base"],
}

/** A projection read as the Snapshot keeps it, with only the tax years the Filers come from. */
function projectionOf(filers: readonly (string | undefined)[]): ProjectionRun {
	return { taxYears: filers.map((filer) => ({ filer })) } as unknown as ProjectionRun
}

/** A document whose Flows and Levy measures state the labels the given ones carry. */
function documentOf(labels: readonly string[], tally: readonly string[]): ScenarioDocument {
	return {
		currency: "THB",
		accounts: [],
		flows: labels.map((label, index) => ({
			id: `f${index}`,
			kind: "income",
			frequency: "once",
			start: "2026-01-01",
			label,
		})),
		levies: [{ measures: tally.map((label) => ({ op: "tally", label })) }],
	} as unknown as ScenarioDocument
}

describe("the labels of a plan with Filers", () => {
	test("each chosen label is suffixed by every Filer, a Return's labels together in the person's order", () => {
		const read = readForFilers(READ, ["me", "partner"])
		expect(read.argv).toContain(
			"allowance.retirement.rmf@me,allowance.thai_esg@me,allowance.retirement.rmf@partner,allowance.thai_esg@partner",
		)
		expect(read.carryInFor).toEqual(["base"])
		expect(read.argv.indexOf("--step")).toBe(READ.argv.indexOf("--step"))
	})

	test("a read that names no labels is left as it was", () => {
		const bare: PlannedRead = { argv: ["projection", "allowances", "--json"], carryInFor: [] }
		expect(readForFilers(bare, ["me"])).toBe(bare)
	})
})

describe("the Filers a plan reads for", () => {
	test("a separate filing takes them from the projection's tax years, in the CLI's order", () => {
		const plan = documentOf([], [])
		expect(filersOf(plan, projectionOf(["me", "partner", "me"]))).toEqual(["me", "partner"])
	})

	test("a joint Return finds them in the plan's own Levy tallies, each Filer once", () => {
		const plan = documentOf(
			["income.section40_1@me"],
			[
				"allowance.retirement.rmf@me",
				"allowance.retirement.rmf@partner",
				"income.section40_1@shared",
			],
		)
		expect(filersOf(plan, projectionOf([undefined]))).toEqual(["me", "partner"])
	})

	test("a Flow's suffix alone names no Filer: only the Levy's own tallies decide", () => {
		const plan = documentOf(["allowance.retirement.rmf@me"], ["allowance.retirement.rmf"])
		expect(filersOf(plan, projectionOf([undefined]))).toEqual([])
	})

	test("a plan without Filers names none", () => {
		const plan = documentOf(["income.section40_1"], ["allowance.retirement.rmf"])
		expect(filersOf(plan, projectionOf([undefined]))).toEqual([])
	})
})
