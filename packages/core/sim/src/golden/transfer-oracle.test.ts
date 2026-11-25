import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import type { Projection } from "../types"
import { oracleAccountWalk } from "./oracle-account-walk"
import { oracleValuation } from "./oracle-state"
import { transferLoan, transferRollover, transferShares, transferShort } from "./transfer-cases"

const CASES: readonly (readonly [string, Fixture])[] = [
	["a whole fund rolled into a locked Account", transferRollover],
	["a yearly share and a quarterly fixed amount, both ways", transferShares],
	["a loan paid down until nothing is owed", transferLoan],
	["a source that holds less than planned", transferShort],
]

function projected(fixture: Fixture) {
	const { baseline, scenario, timeline } = fixture
	const result = project(baseline, scenario, timeline, { cashflowBreakdown: true })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

/** The breakdown's transfer lines summed over every year, by Flow id, leaving out what is zero. */
function summed(projection: Projection, key: "amount" | "unmoved"): Map<string, bigint> {
	const totals = new Map<string, bigint>()
	for (const line of (projection.cashflow ?? []).flatMap((year) => year.transfers ?? [])) {
		totals.set(line.flow, (totals.get(line.flow) ?? 0n) + BigInt(line[key]))
	}
	return nonzero(totals)
}

function nonzero(map: ReadonlyMap<string, bigint>): Map<string, bigint> {
	return new Map([...map].filter(([, amount]) => amount !== 0n))
}

describe("transfers agree with the independent day-by-day oracle", () => {
	for (const [name, fixture] of CASES) {
		const projection = projected(fixture)
		const walk = oracleAccountWalk(fixture, fixture.scenario.flows, fixture.timeline.horizon)

		it(`${name}: every Account on the horizon`, () => {
			const last = projection.rows.at(-1)!
			expect(last.date).toBe(fixture.timeline.horizon)
			const held = new Map(last.balances.map((item) => [item.account, BigInt(item.amount)]))
			const replayed = new Map(
				[...walk.states].map(([id, state]) => [id, oracleValuation(state, last.date)]),
			)
			expect(held).toEqual(replayed)
		})

		it(`${name}: what each Flow moved and could not move over the plan`, () => {
			expect(summed(projection, "amount")).toEqual(nonzero(walk.moved))
			expect(summed(projection, "unmoved")).toEqual(nonzero(walk.unmoved))
			expect(walk.survived).toBe(true)
		})

		it(`${name}: the roll-ups' transfers equal the breakdown's`, () => {
			for (const [index, year] of projection.annual.entries()) {
				const lines = projection.cashflow![index]!.transfers ?? []
				expect(year.transfers).toBe(lines.reduce((sum, line) => sum + line.amount, 0))
			}
		})
	}
})
