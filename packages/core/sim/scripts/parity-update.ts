// Regenerates parity/cases.json from the engine under Bun. Run: bun run parity:update
import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"
import { project } from "../src/engine/project"
import { EVERY_PARITY_CASE } from "../src/golden/every-parity-case"
import {
	chanceOfSuccess,
	contributionSavings,
	financialIndependence,
	planReturnModel,
} from "../src/index"

function hash(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

const cases = EVERY_PARITY_CASE.map((testCase) => {
	const { name, fixture, options, chance, plan, projectOptions, savings } = testCase
	const { baseline, scenario, timeline } = fixture
	const projection = project(baseline, scenario, timeline, projectOptions)
	const levy = scenario.levies?.[0]
	const period = (projection.ok ? projection.projection.levies?.[0]?.periods : undefined)?.find(
		(item) => item.from === savings?.period,
	)
	const base = {
		name,
		baseline,
		scenario,
		timeline,
		...(projectOptions === undefined ? {} : { projectOptions }),
		sha256: hash(projection),
		...(savings === undefined || levy === undefined || period === undefined
			? {}
			: {
					savings,
					savingsSha256: hash(contributionSavings(levy, period, savings.options)),
				}),
	}
	const withFi =
		options === undefined
			? base
			: {
					...base,
					options,
					fiSha256: hash(financialIndependence(baseline, scenario, timeline, options)),
				}
	if (plan !== undefined) {
		const built = planReturnModel(scenario, plan)
		if (!built.ok) throw new Error(`${name}: the plan model was refused`)
		const run = { model: built.model, seed: plan.seed, paths: plan.paths }
		return {
			...withFi,
			plan,
			planSha256: hash(built),
			chanceSha256: hash(chanceOfSuccess(baseline, scenario, timeline, run)),
		}
	}
	if (chance === undefined) return withFi
	return {
		...withFi,
		chance,
		chanceSha256: hash(chanceOfSuccess(baseline, scenario, timeline, chance)),
	}
})
writeFileSync(
	new URL("../parity/cases.json", import.meta.url),
	`${JSON.stringify(cases, null, "\t")}\n`,
)
