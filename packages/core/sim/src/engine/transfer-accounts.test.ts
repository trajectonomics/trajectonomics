import { describe, expect, it } from "bun:test"
import { buildProjection } from "../output/build"
import { periodEndDates } from "../output/periods"
import { rowDates } from "../output/row-dates"
import type { Returns } from "./returns"
import { runEngine } from "./run"
import { saleOfAll, withdrawal } from "./test-assets"
import { chargingSetup, fund as feeFund } from "./test-fee"
import { amounts, makeFixture, rowAt } from "./test-helpers"
import { fund as payingFund, payingSetup, projected } from "./test-payout"
import { transfer, transferAll } from "./test-transfer"

describe("a transfer and the other things an Account does on a date", () => {
	// 400 bps a year paid quarterly on 1,000,000 is 1,000,000 × 400 / 40,000 = 10,000 on 31 March, read before anything lands.
	it("moves what is left after a payout has left the Account, which it read first", () => {
		const projection = projected(
			payingSetup([{ id: "other", kind: "asset", rate: 0 }, payingFund()], {
				balances: { cash: 0, fund: 1_000_000 },
				flows: [transferAll("move", "fund", "other", { start: "2026-03-31" })],
			}),
			{ cashflowBreakdown: true },
		)
		// The transfer planned all 1,000,000 before the payout of 10,000 left, so it moves the 990,000 that is there.
		expect(amounts(rowAt(projection, "2026-03-31"))).toEqual({
			cash: 10_000,
			fund: 0,
			other: 990_000,
		})
		expect(projection.cashflow![0]!.transfers![0]).toMatchObject({
			amount: 990_000,
			unmoved: 10_000,
		})
	})

	// A sale of 300,000 from the same Account leaves first, as a Planned withdrawal; the transfer moves the 200,000 left.
	it("moves what is left after a sale from the same Account", () => {
		const projection = projected({
			accounts: [
				{ id: "cash", kind: "asset", rate: 0 },
				{ id: "a", kind: "asset", rate: 0 },
				{ id: "b", kind: "asset", rate: 0 },
			],
			balances: { a: 500_000 },
			flows: [
				withdrawal("sell", "a", 300_000, { start: "2026-03-01" }),
				transferAll("move", "a", "b", { start: "2026-03-01" }),
			],
			surplus: [{ account: "cash" }],
		})
		expect(amounts(rowAt(projection, "2026-03-01"))).toEqual({ cash: 300_000, a: 0, b: 200_000 })
	})

	it("still sells the whole of an Account on a date another transfer emptied it", () => {
		const projection = projected({
			accounts: [
				{ id: "cash", kind: "asset", rate: 0 },
				{ id: "a", kind: "asset", rate: 0 },
				{ id: "b", kind: "asset", rate: 0 },
			],
			balances: { a: 500_000 },
			flows: [
				saleOfAll("sell", "a", { start: "2026-03-01" }),
				transfer("move", "a", "b", 200_000, { start: "2026-03-01" }),
			],
			surplus: [{ account: "cash" }],
		})
		// The sale sells 500,000 first, so the transfer finds nothing to move.
		expect(amounts(rowAt(projection, "2026-03-01"))).toEqual({ cash: 500_000, a: 0, b: 0 })
	})

	// The fee of 150 bps a year on 1,000,000 is 1,000,000 × 150 / 120,000 = 1,250 on 31 January, read before anything lands.
	it("lets the fee be charged last, on what is left of the Account", () => {
		const kept = projected(
			chargingSetup([feeFund(), { id: "other", kind: "asset", rate: 0 }], {
				balances: { cash: 0, fund: 1_000_000 },
				flows: [transfer("move", "fund", "other", 500_000, { start: "2026-01-31" })],
			}),
		)
		expect(amounts(rowAt(kept, "2026-01-31"))).toEqual({ cash: 0, fund: 498_750, other: 500_000 })
		const emptied = projected(
			chargingSetup([feeFund(), { id: "other", kind: "asset", rate: 0 }], {
				balances: { cash: 0, fund: 1_000_000 },
				flows: [transferAll("move", "fund", "other", { start: "2026-01-31" })],
			}),
		)
		// Nothing is left for the fee to take: it never takes more than the Account holds.
		expect(amounts(rowAt(emptied, "2026-01-31"))).toEqual({ cash: 0, fund: 0, other: 1_000_000 })
	})
})

describe("a transfer between Accounts on a Return series", () => {
	const returns: Returns = {
		returnsVersion: 1,
		series: ["a", "b"].map((account) => ({
			account,
			rows: [{ from: "2023-01-01", returnBps: 1500 }],
		})),
	}

	// Both hold 1,000,000 on a 31-day +15% row. On the 16th (15 days) each is worth 1,072,581. Moving 500,000 moves the
	// part still to earn by the same amount: a 500,000 and b 1,500,000 earn 15% for the 16 days left.
	// a: 572,581 + 75,000 × 16 / 31 = 611,291. b: 1,572,581 + 225,000 × 16 / 31 = 1,688,710.
	it("moves the part still to earn with the money (ADR 0005)", () => {
		const fixture = makeFixture({
			accounts: [
				{ id: "a", kind: "asset", rate: 0 },
				{ id: "b", kind: "asset", rate: 0 },
			],
			balances: { a: 1_000_000, b: 1_000_000 },
			flows: [transfer("move", "a", "b", 500_000, { start: "2023-01-16" })],
			surplus: [{ account: "a" }],
			start: "2023-01-01",
			horizon: "2023-02-01",
		})
		const { baseline, scenario, timeline } = fixture
		const dates = [...rowDates(timeline), ...periodEndDates(timeline.start, timeline.horizon)]
		const run = runEngine(baseline, scenario, timeline, dates, returns)
		if (!run.ok) throw new Error(JSON.stringify(run.problem))
		const built = buildProjection(run.run, baseline, scenario, timeline)
		if ("problem" in built) throw new Error(JSON.stringify(built.problem))
		expect(amounts(built.projection.rows.at(-1)!)).toEqual({ a: 611_291, b: 1_688_710 })
	})
})
