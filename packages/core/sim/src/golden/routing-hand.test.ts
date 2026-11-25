import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { amounts } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { identitySides } from "./cashflow-check"
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

function projected(fixture: Fixture) {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, {
		cashflowBreakdown: true,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

/** The last row's balances, and the one breakdown line of a Timeline inside one year. */
function closing(fixture: Fixture) {
	const projection = projected(fixture)
	const row = projection.rows[projection.rows.length - 1]!
	return { balances: amounts(row), line: projection.cashflow!.at(-1)!, projection }
}

describe("a share step takes a share of what is left", () => {
	it("30 per cent of 1,000,001 is 300,000 (the 0.3 dropped), and the uncapped step keeps 700,001", () => {
		const { balances, line } = closing(shareThenRest)
		expect(balances).toEqual({ cash: 700_001, invest: 300_000 })
		expect(line.surplus).toEqual([
			{ account: "invest", amount: 300_000 },
			{ account: "cash", amount: 700_001 },
		])
	})

	it("a cap at 250,000 stops the share step, and the 50,000 it leaves goes to the next step", () => {
		const { balances, line } = closing(shareCapped)
		expect(balances).toEqual({ cash: 750_000, invest: 250_000 })
		expect(identitySides(line)).toEqual({ moneyIn: 1_000_000, moneyOut: 1_000_000 })
	})

	it("reads what is left after the steps before it: 50,000 tops up, then half of 950,000", () => {
		const { balances, line } = closing(topUpThenShare)
		expect(balances).toEqual({ emergency: 200_000, invest: 475_000, cash: 475_000 })
		expect(line.surplus.map((item) => item.amount)).toEqual([50_000, 475_000, 475_000])
	})
})

describe("a withdrawal floor keeps money in an Account while others are drawn", () => {
	it("draws savings to its floor, then the funds, then below the floor", () => {
		const { balances, line, projection } = closing(floorThenFunds)
		expect(balances).toEqual({ savings: 100_000, funds: 0, cash: 0 })
		expect(projection.runsOut).toBeUndefined()
		expect(line.drawn).toEqual([
			{ account: "savings", amount: 200_000, entry: 0 },
			{ account: "funds", amount: 200_000, entry: 1 },
			{ account: "savings", amount: 200_000, entry: 2 },
		])
		expect(line.unmet).toBe(0)
		expect(identitySides(line)).toEqual({ moneyIn: 600_000, moneyOut: 600_000 })
	})

	it("stops at the floor: the Shortfall it cannot meet is unmet, never overdrawn", () => {
		const { balances, line, projection } = closing(floorStopsDraw)
		expect(balances["savings"]).toBe(300_000)
		expect(projection.runsOut).toEqual({ date: "2026-02-01", unmet: 400_000 })
		expect(line.drawn).toEqual([{ account: "savings", amount: 200_000, entry: 0 }])
		expect(line.unmet).toBe(400_000)
		expect(identitySides(line)).toEqual({ moneyIn: 600_000, moneyOut: 600_000 })
	})

	it("skips a locked Account, whatever its floor", () => {
		const { balances, line } = closing(lockedFloor)
		expect(balances).toEqual({ rmf: 900_000, savings: 400_000, cash: 0 })
		expect(line.drawn).toEqual([{ account: "savings", amount: 100_000, entry: 1 }])
	})
})

describe("a target that keeps its value in today's money", () => {
	it("a floor of 300,000 is 347,782 after five years at 3 per cent, so 152,218 is drawn", () => {
		const { balances, projection } = closing(realFloor)
		expect(balances["savings"]).toBe(347_782)
		expect(projection.runsOut).toEqual({ date: "2031-02-01", unmet: 47_782 })
	})

	it("a fund target of 1,000,000 is topped up to 1,159,274 after five years", () => {
		const { balances } = closing(realTarget)
		expect(balances).toEqual({ emergency: 1_159_274, cash: 840_726 })
	})
})
