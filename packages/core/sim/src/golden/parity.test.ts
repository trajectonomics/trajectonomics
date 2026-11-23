import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { project } from "../engine/project"
import { chanceOfSuccess, financialIndependence } from "../index"
import type { ChanceOfSuccessOptions, SurvivalOptions } from "../types"
import { CASHFLOW_PARITY_CASES } from "./cashflow-parity-cases"
import { CATEGORY_PARITY_CASES } from "./category-parity-cases"
import { PARITY_CASES } from "./parity-cases"
import { STATEMENT_PARITY_CASES } from "./statement-parity-cases"

const ALL_PARITY_CASES = [
	...PARITY_CASES,
	...STATEMENT_PARITY_CASES,
	...CATEGORY_PARITY_CASES,
	...CASHFLOW_PARITY_CASES,
]

interface Recorded {
	readonly name: string
	readonly sha256: string
	readonly options?: SurvivalOptions
	readonly fiSha256?: string
	readonly chance?: ChanceOfSuccessOptions
	readonly chanceSha256?: string
}

const recorded: readonly Recorded[] = JSON.parse(
	readFileSync(new URL("../../parity/cases.json", import.meta.url), "utf8"),
)

function hash(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

describe("parity/cases.json", () => {
	it("lists exactly the parity cases", () => {
		expect(recorded.map((item) => item.name)).toEqual(ALL_PARITY_CASES.map((item) => item.name))
	})

	it.each(ALL_PARITY_CASES.map((item) => [item.name, item] as const))(
		"%s hashes as recorded (run `bun run parity:update` after an intended change)",
		(name, { fixture, options, chance, projectOptions }) => {
			const { baseline, scenario, timeline } = fixture
			const record = recorded.find((item) => item.name === name)
			expect(hash(project(baseline, scenario, timeline, projectOptions))).toBe(
				record?.sha256 ?? "missing",
			)
			if (options !== undefined) {
				expect(hash(financialIndependence(baseline, scenario, timeline, options))).toBe(
					record?.fiSha256 ?? "missing",
				)
			}
			if (chance === undefined) return
			expect(hash(chanceOfSuccess(baseline, scenario, timeline, chance))).toBe(
				record?.chanceSha256 ?? "missing",
			)
		},
	)
})
