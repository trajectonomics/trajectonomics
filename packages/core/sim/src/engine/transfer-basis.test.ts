import { describe, expect, it } from "bun:test"
import type { Account, Flow, Levy, MinorUnits, Projection } from "../types"
import { saleOfAll } from "./test-assets"
import { emptyCarryIn, periodFrom, run, withCarryIn } from "./test-helpers"
import { transfer } from "./test-transfer"

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
const fundA: Account = { id: "a", kind: "asset", rate: 0, gainLabel: "gain" }
const fundB: Account = { id: "b", kind: "asset", rate: 0, gainLabel: "gain" }
const plain: Account = { id: "a", kind: "asset", rate: 0 }
const MOVE = { start: "2026-06-01" } as const
const SELL = { start: "2026-07-01" } as const

/** Fund a holds 1,000,000 on a Cost basis of 600,000; the transfer is 250,000, a quarter of it. */
function plan(flows: readonly Flow[], accounts: readonly Account[] = [cash, fundA, fundB]) {
	return run({
		accounts,
		balances: { a: 1_000_000 },
		basis: { a: 600_000 },
		flows,
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		levy,
		start: "2026-01-01",
		horizon: "2026-12-31",
		resolution: "day",
	})
}

function gained(projection: Projection): MinorUnits {
	return periodFrom(projection, "2026-01-01").measures.find((m) => m.id === "gain")!.value
}

describe("the Cost basis moves with the money", () => {
	// A quarter of the money takes a quarter of the basis: 600,000 × 250,000 / 1,000,000 = 150,000 leaves a (450,000 stay).
	it("tallies no gain on an untaxed transfer", () => {
		expect(gained(plan([transfer("move", "a", "b", 250_000, MOVE)]))).toBe(0)
	})

	// a then sells its 750,000 on a basis of 450,000 (a gain of 300,000), and b its 250,000 on 150,000 (100,000).
	it("carries the source's basis share to the target, so the gain is taxed once, on the sale", () => {
		const move = transfer("move", "a", "b", 250_000, MOVE)
		expect(gained(plan([move, saleOfAll("sell", "a", SELL)]))).toBe(300_000)
		expect(gained(plan([move, saleOfAll("sell", "b", SELL)]))).toBe(100_000)
		const both = plan([move, saleOfAll("sell-a", "a", SELL), saleOfAll("sell-b", "b", SELL)])
		// Together 1,000,000 − 600,000: no gain was lost or made by moving.
		expect(gained(both)).toBe(400_000)
	})

	// The same 250,000 realised: the gain at a is 250,000 − 150,000 = 100,000 on the date, and b starts at 250,000.
	it("realises the gain at the source and starts the target's basis at the amount, with realise", () => {
		const move = transfer("move", "a", "b", 250_000, { ...MOVE, realise: true })
		expect(gained(plan([move]))).toBe(100_000)
		expect(gained(plan([move, saleOfAll("sell", "b", SELL)]))).toBe(100_000)
		expect(
			gained(plan([move, saleOfAll("sell-a", "a", SELL), saleOfAll("sell-b", "b", SELL)])),
		).toBe(400_000)
	})

	// An Account with no gainLabel has no basis to give: the target's basis starts at what moved, so selling it gains nothing.
	it("starts the target's basis at the amount moved when the source tracks none", () => {
		const projection = plan(
			[transfer("move", "a", "b", 250_000, MOVE), saleOfAll("sell", "b", SELL)],
			[cash, plain, fundB],
		)
		expect(gained(projection)).toBe(0)
	})

	// A target with no gainLabel takes no basis: a's remaining 750,000 still sells on 450,000, and the 150,000 is gone.
	it("lets the basis leave with the money when the target tracks none", () => {
		const plainB: Account = { id: "b", kind: "asset", rate: 0 }
		const projection = plan(
			[transfer("move", "a", "b", 250_000, MOVE), saleOfAll("sell", "a", SELL)],
			[cash, fundA, plainB],
		)
		expect(gained(projection)).toBe(300_000)
	})

	// 5 of basis on 1,000: 100 is a tenth, 0.5 of basis, rounded half up to 1 as a sale rounds it; a then sells 900 on 4: 896.
	it("rounds the basis share half up, as a sale does", () => {
		const projection = run({
			accounts: [cash, fundA, fundB],
			balances: { a: 1_000 },
			basis: { a: 5 },
			flows: [transfer("move", "a", "b", 100, MOVE), saleOfAll("sell", "a", SELL)],
			surplus: [{ account: "cash" }],
			levy,
			start: "2026-01-01",
			horizon: "2026-12-31",
			resolution: "day",
		})
		expect(gained(projection)).toBe(896)
	})
})
