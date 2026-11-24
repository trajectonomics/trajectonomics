import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import { oracleCashflow } from "./oracle-cashflow"
import { oracleView } from "./oracle-view"
import {
	floorStopsDraw,
	floorThenFunds,
	lockedFloor,
	realFloor,
	realTarget,
	shareCapped,
	shareThenRest,
	topUpThenShare,
} from "./routing-cases"

const CASES: readonly (readonly [string, Fixture])[] = [
	["a share step then an uncapped step", shareThenRest],
	["a share step capped by upTo", shareCapped],
	["a top-up then a share of what is left", topUpThenShare],
	["a floor, then another Account, then below the floor", floorThenFunds],
	["a floor that stops a Shortfall", floorStopsDraw],
	["a locked Account with a floor", lockedFloor],
	["a floor kept in today's money", realFloor],
	["an upTo kept in today's money", realTarget],
]

function projected(fixture: Fixture) {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, {
		cashflowBreakdown: true,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

describe("routing agrees with the independent oracle", () => {
	for (const [name, fixture] of CASES) {
		it(`${name}: every row, the run-out and the roll-ups`, () => {
			const projection = projected(fixture)
			const view = oracleView(
				fixture,
				projection.rows.map((row) => row.date),
			)
			expect(projection.rows).toEqual(view.rows)
			expect(projection.runsOut).toEqual(view.runsOut)
			expect(projection.annual).toEqual(view.annual)
		})

		it(`${name}: what each step filled and each entry drew, from the breakdown`, () => {
			const line = projected(fixture).cashflow!.at(-1)!
			const oracle = oracleCashflow(fixture)
			const filled = new Map(line.surplus.map((item) => [item.account, BigInt(item.amount)]))
			expect(filled).toEqual(new Map([...oracle.surplus].filter(([, amount]) => amount !== 0n)))
			const drawn = new Map(line.drawn.map((item, at) => [item.entry ?? at, BigInt(item.amount)]))
			const replayed = new Map(
				[...oracle.drawn].map(([position, amount]) => [Number(position), amount]),
			)
			expect(drawn).toEqual(replayed)
			expect(line.unmet).toBe(Number(oracle.unmet))
		})
	}
})
