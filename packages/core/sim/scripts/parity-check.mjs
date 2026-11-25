// Runs the built package under Node (V8) against the hashes recorded under Bun (JavaScriptCore).
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import {
	chanceOfSuccess,
	contributionSavings,
	financialIndependence,
	planReturnModel,
	project,
} from "../dist/index.mjs"

const cases = JSON.parse(readFileSync(new URL("../parity/cases.json", import.meta.url), "utf8"))
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
const failed = cases.filter(
	({
		baseline,
		scenario,
		timeline,
		sha256,
		options,
		fiSha256,
		chance,
		chanceSha256,
		plan,
		planSha256,
		projectOptions,
		savings,
		savingsSha256,
	}) => {
		const projection = project(baseline, scenario, timeline, projectOptions)
		if (digest(projection) !== sha256) return true
		if (savings !== undefined) {
			const period = projection.projection.levies[0].periods.find(
				(item) => item.from === savings.period,
			)
			const said = contributionSavings(scenario.levies[0], period, savings.options)
			if (digest(said) !== savingsSha256) return true
		}
		if (options !== undefined) {
			if (digest(financialIndependence(baseline, scenario, timeline, options)) !== fiSha256)
				return true
		}
		if (plan !== undefined) {
			const built = planReturnModel(scenario, plan)
			const run = { model: built.model, seed: plan.seed, paths: plan.paths }
			return (
				digest(built) !== planSha256 ||
				digest(chanceOfSuccess(baseline, scenario, timeline, run)) !== chanceSha256
			)
		}
		if (chance === undefined) return false
		return digest(chanceOfSuccess(baseline, scenario, timeline, chance)) !== chanceSha256
	},
)
for (const { name } of failed) console.error(`parity mismatch: ${name}`)
if (failed.length > 0) process.exit(1)
console.log(`parity ok: ${cases.length} cases under node ${process.version}`)
