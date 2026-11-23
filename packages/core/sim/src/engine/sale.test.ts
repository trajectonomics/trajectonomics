import { describe, expect, it } from "bun:test"
import type { Account, Flow, Levy, Milestone, MinorUnits, Projection } from "../types"
import { project } from "./project"
import { purchase, saleOfAll, withdrawal } from "./test-assets"
import { expense } from "./test-flows"
import {
	amounts,
	emptyCarryIn,
	makeFixture,
	periodFrom,
	rowAt,
	run,
	withCarryIn,
} from "./test-helpers"

const gains: Levy = {
	id: "gains",
	period: { month: 1, day: 1 },
	settlement: { month: 3, day: 31 },
	measures: [
		{ id: "gain", op: "tally", label: "gain", basis: "gains" },
		{ id: "zero", op: "const", value: 0 },
	],
	due: "zero",
}
const levy = withCarryIn(gains, emptyCarryIn("2025-01-01"))

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const home: Account = { id: "home", kind: "asset", rate: 0, liquid: false, gainLabel: "gain" }
const plain: Account = { id: "home", kind: "asset", rate: 0, liquid: false }
const SALE = { start: "2026-06-01" } as const
const YEAR = { start: "2026-01-01", horizon: "2026-12-31", resolution: "day" } as const

function selling(flows: readonly Flow[], extra: Partial<Parameters<typeof run>[0]> = {}) {
	return run({
		accounts: [cash, home],
		balances: { cash: 0, home: 500_000_000 },
		basis: { home: 400_000_000 },
		flows,
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		levy,
		...YEAR,
		...extra,
	})
}

function gained(projection: Projection): MinorUnits {
	return periodFrom(projection, "2026-01-01").measures.find((m) => m.id === "gain")!.value
}

describe("a withdrawal from an asset sells it", () => {
	// Home 5,000,000.00 on a Cost basis of 4,000,000.00, all of it sold on 1 Jun: 5,000,000.00 in cash,
	// Realised gain 5,000,000.00 − 4,000,000.00 = 1,000,000.00, and accessible net worth rises from 0.
	it("moves the whole value into cash, tallies the gain, and raises accessible net worth", () => {
		const projection = selling([saleOfAll("sell", "home", SALE)])
		expect(amounts(rowAt(projection, "2026-05-31"))).toEqual({ cash: 0, home: 500_000_000 })
		expect(rowAt(projection, "2026-05-31").accessibleNetWorth).toBe(0)
		expect(amounts(rowAt(projection, "2026-06-01"))).toEqual({ cash: 500_000_000, home: 0 })
		expect(rowAt(projection, "2026-06-01").accessibleNetWorth).toBe(500_000_000)
		expect(gained(projection)).toBe(100_000_000)
		expect(projection.annual[0]?.withdrawals).toBe(500_000_000)
	})

	// 2,000,000.00 of a 5,000,000.00 home uses 40% of the basis: 1,600,000.00, a gain of 400,000.00.
	it("moves a stated amount, using up a proportional share of the Cost basis", () => {
		const projection = selling([withdrawal("sell", "home", 200_000_000, SALE)])
		expect(amounts(rowAt(projection, "2026-06-01"))).toEqual({
			cash: 200_000_000,
			home: 300_000_000,
		})
		expect(gained(projection)).toBe(40_000_000)
	})

	it("moves at most the value: a planned 7,000,000.00 sells the 5,000,000.00 the home is worth", () => {
		const projection = selling([withdrawal("sell", "home", 700_000_000, SALE)])
		expect(amounts(rowAt(projection, "2026-06-01"))).toEqual({ cash: 500_000_000, home: 0 })
		expect(projection.annual[0]?.withdrawals).toBe(500_000_000)
	})

	// The owner's rule: proceeds are a planned withdrawal, never Available cashflow. A 1,000.00 target
	// Contribution on the sale day with no income stays wholly unfunded although 5,000,000.00 landed.
	it("never lets the proceeds fund a target Contribution", () => {
		const projection = run({
			accounts: [cash, { id: "etf", kind: "asset", rate: 0 }, plain],
			balances: { home: 500_000_000 },
			flows: [
				withdrawal("sell", "home", 500_000_000, SALE),
				{ ...purchase("save", "etf", 100_000, SALE), funding: "target" },
			],
			surplus: [{ account: "cash" }],
			contribute: ["etf"],
			withdraw: ["cash"],
			...YEAR,
		})
		expect(amounts(rowAt(projection, "2026-06-01"))).toEqual({ cash: 500_000_000, etf: 0, home: 0 })
		expect(projection.annual[0]?.unfundedContributions).toBe(100_000)
	})

	it("pays a same-date expense from the proceeds before the withdraw list", () => {
		const projection = selling([
			withdrawal("sell", "home", 300_000_000, SALE),
			expense("tax", 50_000_000, SALE),
		])
		expect(amounts(rowAt(projection, "2026-06-01"))).toEqual({
			cash: 250_000_000,
			home: 200_000_000,
		})
	})
})

describe("a sale from a locked source", () => {
	const open: Milestone = {
		id: "open",
		combine: "all",
		criteria: [{ id: "on", kind: "date", on: "2026-03-01" }],
	}
	const locked: Account = { ...plain, lockedUntil: "2026-09-01" }

	// Open from 1 Mar but locked until 1 Sep: each monthly 1,000,000.00 sale before 1 Sep moves nothing.
	it("moves nothing before lockedUntil and sells from that date", () => {
		const { baseline, scenario, timeline } = makeFixture({
			accounts: [cash, locked],
			balances: { home: 500_000_000 },
			flows: [
				withdrawal("sell", "home", 100_000_000, {
					frequency: "monthly",
					start: "2026-01-01",
					startAt: "open",
				}),
			],
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			...YEAR,
		})
		const result = project(baseline, { ...scenario, milestones: [open] }, timeline)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const { projection } = result
		expect(amounts(rowAt(projection, "2026-08-31"))).toEqual({ cash: 0, home: 500_000_000 })
		expect(amounts(rowAt(projection, "2026-09-01"))).toEqual({
			cash: 100_000_000,
			home: 400_000_000,
		})
		expect(projection.annual[0]?.withdrawals).toBe(400_000_000)
	})
})
