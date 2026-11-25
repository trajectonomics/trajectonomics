import type { ProjectionChance, ProjectionPath } from "../../contract"
import { projectionRunFixture } from "../projection/fixtures.test-support"
import { chanceFixture } from "./fixtures.test-support"

/** Closing net worths of the fixture's six paths, by index: path 2 and path 4 run out, path 4 owing money. */
const CLOSINGS = ["900.50", "-0.00", "0.00", "1250000.00", "-5200.25", "75.10"] as const

/** A chance read that lists six paths (`--outcomes`) and names its picks, over the fixture's three roll-ups. */
export function chanceWithOutcomes(overrides: Partial<ProjectionChance> = {}): ProjectionChance {
	return chanceFixture({
		paths: 6,
		definition: {
			modelId: "illustrative-demo-model",
			seed: "0123456789abcdef",
			paths: 6,
			modelHash: "jcs1:sha256:0000000000000000000000000000000000000000000000000000000000000000",
		},
		outcomes: CLOSINGS.map((closingNetWorth, index) => {
			const ranOut = index === 2 || index === 4
			return {
				index,
				closingNetWorth,
				lowestNetWorth: ranOut ? closingNetWorth : "10.00",
				lowestYear: ranOut ? "2027-10-31" : "2028-10-31",
				runsOut: ranOut ? { date: "2028-03-15", unmet: "120.00" } : null,
			}
		}),
		representative: { p10: 4, p50: 0, p90: 3, earliestRunsOut: 2, lowest: 4 },
		...overrides,
	})
}

/** The replay of one path of `chanceWithOutcomes`: the fixture projection, of the same run, with each year's returns. */
export function pathFixture(index: number, patch: Partial<ProjectionPath> = {}): ProjectionPath {
	const chance = chanceWithOutcomes()
	const run = projectionRunFixture({ scenario: chance.scenario, horizon: chance.horizon })
	return {
		...run,
		index,
		definition: chance.definition,
		runsOut: index === 2 ? { date: "2028-03-15", unmet: "120.00" } : null,
		returns: [0, 1, 2].map((rollup) => ({
			index: rollup,
			from: `${2026 + rollup}-10-31`,
			to: `${2027 + rollup}-10-30`,
			accounts: [
				{ account: "acct-fund", returnBps: rollup === 1 ? -120 : 882 },
				{ account: "acct-bank", returnBps: 118 },
			],
		})),
		...patch,
	}
}
