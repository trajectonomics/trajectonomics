import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import {
	chanceOfSuccess,
	contributionSavings,
	financialIndependence,
	planReturnModel,
} from "../index"
import type { ChanceOfSuccessOptions, ProjectionResult, Scenario, SurvivalOptions } from "../types"
import { EVERY_PARITY_CASE } from "./every-parity-case"
import type { ParityCase } from "./parity-cases"
import type { ParitySavings } from "./parity-savings"

interface Recorded {
	readonly name: string
	readonly sha256: string
	readonly options?: SurvivalOptions
	readonly fiSha256?: string
	readonly chance?: ChanceOfSuccessOptions
	readonly chanceSha256?: string
	readonly planSha256?: string
	readonly savingsSha256?: string
}

const recorded: readonly Recorded[] = JSON.parse(
	readFileSync(new URL("../../parity/cases.json", import.meta.url), "utf8"),
)

function hash(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function savingsHash(result: ProjectionResult, scenario: Scenario, savings: ParitySavings): string {
	const periods = result.ok ? (result.projection.levies?.[0]?.periods ?? []) : []
	const period = periods.find((item) => item.from === savings.period)
	const levy = scenario.levies?.[0]
	if (period === undefined || levy === undefined) throw new Error("no Levy period to pin")
	return hash(contributionSavings(levy, period, savings.options))
}

/** A chance case hashes its run; a plan case first hashes the Return model built from the Scenario. */
function expectChance(
	{ baseline, scenario, timeline }: Fixture,
	{
		plan,
		chance,
	}: {
		readonly plan: ParityCase["plan"] | undefined
		readonly chance: ChanceOfSuccessOptions | undefined
	},
	record: Recorded | undefined,
): void {
	let run = chance
	if (plan !== undefined) {
		const built = planReturnModel(scenario, plan)
		if (!built.ok) throw new Error("the plan model was refused")
		expect(hash(built)).toBe(record?.planSha256 ?? "missing")
		run = { model: built.model, seed: plan.seed, paths: plan.paths }
	}
	if (run === undefined) return
	expect(hash(chanceOfSuccess(baseline, scenario, timeline, run))).toBe(
		record?.chanceSha256 ?? "missing",
	)
}

describe("parity/cases.json", () => {
	it("lists exactly the parity cases", () => {
		expect(recorded.map((item) => item.name)).toEqual(EVERY_PARITY_CASE.map((item) => item.name))
	})

	it.each(EVERY_PARITY_CASE.map((item) => [item.name, item] as const))(
		"%s hashes as recorded (run `bun run parity:update` after an intended change)",
		(name, { fixture, options, chance, plan, projectOptions, savings }) => {
			const { baseline, scenario, timeline } = fixture
			const record = recorded.find((item) => item.name === name)
			const projection = project(baseline, scenario, timeline, projectOptions)
			expect(hash(projection)).toBe(record?.sha256 ?? "missing")
			if (savings !== undefined) {
				expect(savingsHash(projection, scenario, savings)).toBe(record?.savingsSha256 ?? "missing")
			}
			if (options !== undefined) {
				expect(hash(financialIndependence(baseline, scenario, timeline, options))).toBe(
					record?.fiSha256 ?? "missing",
				)
			}
			expectChance(fixture, { plan, chance }, record)
		},
	)
})
