// Runs the built package under Node (V8) against the hashes recorded under Bun (JavaScriptCore).
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import {
	chanceOfSuccess,
	contributionSavings,
	financialIndependence,
	planReturnModel,
	project,
	projectPath,
} from "../dist/index.mjs"

const cases = JSON.parse(readFileSync(new URL("../parity/cases.json", import.meta.url), "utf8"))
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex")

function matchesPlan(baseline, scenario, timeline, plan, planSha256, chanceSha256) {
	const built = planReturnModel(scenario, plan)
	const run = { model: built.model, seed: plan.seed, paths: plan.paths }
	return (
		digest(built) === planSha256 &&
		digest(chanceOfSuccess(baseline, scenario, timeline, run)) === chanceSha256
	)
}

function matchesPath(baseline, scenario, timeline, path, pathSha256) {
	const built = planReturnModel(scenario, path)
	const run = { model: built.model, seed: path.seed, paths: path.paths, index: path.index }
	return digest(projectPath(baseline, scenario, timeline, run)) === pathSha256
}

function matchesSavings(scenario, projection, savings, savingsSha256) {
	const period = projection.projection.levies[0].periods.find(
		(item) => item.from === savings.period,
	)
	const said = contributionSavings(scenario.levies[0], period, savings.options)
	return digest(said) === savingsSha256
}

function matches(record) {
	const { baseline, scenario, timeline, sha256, projectOptions } = record
	const projection = project(baseline, scenario, timeline, projectOptions)
	if (digest(projection) !== sha256) return false
	if (record.savings !== undefined) {
		if (!matchesSavings(scenario, projection, record.savings, record.savingsSha256)) return false
	}
	if (record.options !== undefined) {
		const fi = financialIndependence(baseline, scenario, timeline, record.options)
		if (digest(fi) !== record.fiSha256) return false
	}
	if (record.plan !== undefined) {
		return matchesPlan(
			baseline,
			scenario,
			timeline,
			record.plan,
			record.planSha256,
			record.chanceSha256,
		)
	}
	if (record.path !== undefined) {
		return matchesPath(baseline, scenario, timeline, record.path, record.pathSha256)
	}
	if (record.chance === undefined) return true
	return (
		digest(chanceOfSuccess(baseline, scenario, timeline, record.chance)) === record.chanceSha256
	)
}

const failed = cases.filter((record) => !matches(record))
for (const { name } of failed) console.error(`parity mismatch: ${name}`)
if (failed.length > 0) process.exit(1)
console.log(`parity ok: ${cases.length} cases under node ${process.version}`)
