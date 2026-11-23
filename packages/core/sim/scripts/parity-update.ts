// Regenerates parity/cases.json from the engine under Bun. Run: bun run parity:update
import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"
import { project } from "../src/engine/project"
import { CATEGORY_PARITY_CASES } from "../src/golden/category-parity-cases"
import { PARITY_CASES } from "../src/golden/parity-cases"
import { STATEMENT_PARITY_CASES } from "../src/golden/statement-parity-cases"
import { chanceOfSuccess, financialIndependence } from "../src/index"

function hash(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

const cases = [...PARITY_CASES, ...STATEMENT_PARITY_CASES, ...CATEGORY_PARITY_CASES].map(
	(testCase) => {
		const { name, fixture, options, chance, projectOptions } = testCase
		const { baseline, scenario, timeline } = fixture
		const base = {
			name,
			baseline,
			scenario,
			timeline,
			...(projectOptions === undefined ? {} : { projectOptions }),
			sha256: hash(project(baseline, scenario, timeline, projectOptions)),
		}
		const withFi =
			options === undefined
				? base
				: {
						...base,
						options,
						fiSha256: hash(financialIndependence(baseline, scenario, timeline, options)),
					}
		if (chance === undefined) return withFi
		return {
			...withFi,
			chance,
			chanceSha256: hash(chanceOfSuccess(baseline, scenario, timeline, chance)),
		}
	},
)
writeFileSync(
	new URL("../parity/cases.json", import.meta.url),
	`${JSON.stringify(cases, null, "\t")}\n`,
)
