// Regenerates parity/cases.json from the engine under Bun. Run: bun run parity:update
import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"
import { project } from "../src/engine/project"
import { EVERY_PARITY_CASE } from "../src/golden/every-parity-case"
import type { ParityCase } from "../src/golden/parity-cases"
import {
	chanceOfSuccess,
	contributionSavings,
	financialIndependence,
	planReturnModel,
	projectPath,
} from "../src/index"
import type { ProjectionResult } from "../src/types"

function hash(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

/** The plan model a case states, or a thrown failure: a parity case never records a refused model. */
function planOf({ fixture }: ParityCase, run: NonNullable<ParityCase["plan"]>) {
	const built = planReturnModel(fixture.scenario, run)
	if (!built.ok) throw new Error("the plan model was refused")
	return built
}

function savingsOf(testCase: ParityCase, projection: ProjectionResult) {
	const { savings } = testCase
	const levy = testCase.fixture.scenario.levies?.[0]
	const periods = projection.ok ? projection.projection.levies?.[0]?.periods : undefined
	const period = periods?.find((item) => item.from === savings?.period)
	if (savings === undefined || levy === undefined || period === undefined) return {}
	return { savings, savingsSha256: hash(contributionSavings(levy, period, savings.options)) }
}

function fiOf(testCase: ParityCase) {
	const { baseline, scenario, timeline } = testCase.fixture
	const { options } = testCase
	if (options === undefined) return {}
	return { options, fiSha256: hash(financialIndependence(baseline, scenario, timeline, options)) }
}

/** The chance fields a case records: a plan's built model, a path's replay, or a hand-written run. */
function chanceOf(testCase: ParityCase) {
	const { baseline, scenario, timeline } = testCase.fixture
	const { plan, path, chance } = testCase
	if (plan !== undefined) {
		const built = planOf(testCase, plan)
		const run = { model: built.model, seed: plan.seed, paths: plan.paths }
		return {
			plan,
			planSha256: hash(built),
			chanceSha256: hash(chanceOfSuccess(baseline, scenario, timeline, run)),
		}
	}
	if (path !== undefined) {
		const built = planOf(testCase, path)
		const selection = { model: built.model, seed: path.seed, paths: path.paths, index: path.index }
		return { path, pathSha256: hash(projectPath(baseline, scenario, timeline, selection)) }
	}
	if (chance === undefined) return {}
	return { chance, chanceSha256: hash(chanceOfSuccess(baseline, scenario, timeline, chance)) }
}

const cases = EVERY_PARITY_CASE.map((testCase) => {
	const { name, fixture, projectOptions } = testCase
	const { baseline, scenario, timeline } = fixture
	const projection = project(baseline, scenario, timeline, projectOptions)
	return {
		name,
		baseline,
		scenario,
		timeline,
		...(projectOptions === undefined ? {} : { projectOptions }),
		sha256: hash(projection),
		...savingsOf(testCase, projection),
		...fiOf(testCase),
		...chanceOf(testCase),
	}
})
writeFileSync(
	new URL("../parity/cases.json", import.meta.url),
	`${JSON.stringify(cases, null, "\t")}\n`,
)
