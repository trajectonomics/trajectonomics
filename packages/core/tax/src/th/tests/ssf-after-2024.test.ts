import { describe, expect, it } from "bun:test"
import { addRetirementAllowances } from "../levy/allowances-retirement"
import { addAssessableMeasures } from "../levy/assessable"
import { ThLevyContributionLabel, ThLevyIncomeLabel } from "../levy/labels"
import { ThLevyMeasureId } from "../levy/measure-ids"
import { addSection40_4 } from "../levy/regimes"
import { TH_2026_PARAMETERS } from "../parameters"
import { toSatang } from "../units"
import { runLevy } from "./levy-build"

// SSF stopped being deductible for income received after 31 December 2024 (ADR 0007). This package
// emits one tax year, 2026, so that is the year asserted; the label stays so older plans still check.
const SSF = ThLevyContributionLabel.Ssf

function cluster(contributions: ReadonlyMap<string, number>): number {
	const income = new Map([[ThLevyIncomeLabel.Section40_1, toSatang(4_000_000)]])
	const run = runLevy(income, contributions, (graph, tallies) => {
		const assessable = addAssessableMeasures(graph, tallies, addSection40_4(graph, tallies))
		return addRetirementAllowances(graph, tallies, assessable.total).cluster
	})
	return run.values.get(ThLevyMeasureId.RetirementCluster) ?? Number.NaN
}

describe("SSF in the 2026 tax year", () => {
	it("holds a zero rate and a zero ceiling, so nothing is deductible", () => {
		expect(TH_2026_PARAMETERS.allowances.retirementCluster.ssf).toEqual({ maxRate: 0, ceiling: 0 })
	})

	it("allows nothing on the SSF label in the Levy, however much was bought", () => {
		for (const baht of [1, 200_000, 3_000_000]) {
			expect(cluster(new Map([[SSF, toSatang(baht)]]))).toBe(0)
		}
	})

	it("does not let an SSF purchase use up room under the 500,000 cluster ceiling", () => {
		const rmf = new Map([[ThLevyContributionLabel.Rmf, toSatang(400_000)]])
		const both = new Map([...rmf, [SSF, toSatang(200_000)]])
		expect(cluster(both)).toBe(toSatang(400_000))
		expect(cluster(both)).toBe(cluster(rmf))
	})
})
