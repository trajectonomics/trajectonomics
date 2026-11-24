import { describe, expect, it } from "bun:test"
import type { Account } from "../types"
import { employerShare } from "./test-employer"
import { contribution, expense, income } from "./test-flows"
import { amounts, rowAt } from "./test-helpers"
import { projected } from "./test-payout"
import { transfer, transferAll } from "./test-transfer"

const a: Account = { id: "a", kind: "asset", rate: 0 }
const b: Account = { id: "b", kind: "asset", rate: 0 }
const c: Account = { id: "c", kind: "asset", rate: 0 }
const DAY = "2026-03-01"
const YEAR = { start: "2026-01-01", horizon: "2026-12-31" } as const

describe("the order of a date: a transfer lands after contributions and before routing", () => {
	// Savings 500,000, and 200,000 of salary contributed to it on the same date: a fixed 600,000 transfer sees 700,000.
	it("moves money a contribution put into the source on the same date", () => {
		const projection = projected({
			...YEAR,
			accounts: [a, b],
			balances: { a: 500_000 },
			flows: [
				income("pay", 200_000, { start: DAY }),
				contribution("save", "a", 200_000, { start: DAY }),
				transfer("move", "a", "b", 600_000, { start: DAY }),
			],
			contribute: ["a"],
			surplus: [{ account: "a" }],
			withdraw: ["a"],
		})
		expect(amounts(rowAt(projection, DAY))).toEqual({ a: 100_000, b: 600_000 })
	})

	// A Derived amount reads the source before anything lands (ADR 0020): "all of a" is the 500,000 held at the start.
	it("moves what a Derived amount read before the contribution landed, and leaves the contribution", () => {
		const projection = projected({
			...YEAR,
			accounts: [a, b],
			balances: { a: 500_000 },
			flows: [
				income("pay", 200_000, { start: DAY }),
				contribution("save", "a", 200_000, { start: DAY }),
				transferAll("move", "a", "b", { start: DAY }),
			],
			contribute: ["a"],
			surplus: [{ account: "a" }],
			withdraw: ["a"],
		})
		expect(amounts(rowAt(projection, DAY))).toEqual({ a: 200_000, b: 500_000 })
	})

	// 500,000 moved out of `a` first, then the 100,000 of leftover pay goes to the surplus step into `a`.
	it("lands before the surplus step, so the surplus fills the emptied source", () => {
		const projection = projected({
			...YEAR,
			accounts: [a, b],
			balances: { a: 500_000 },
			flows: [
				income("pay", 100_000, { start: DAY }),
				transferAll("move", "a", "b", { start: DAY }),
			],
			surplus: [{ account: "a" }],
			withdraw: ["a"],
		})
		expect(amounts(rowAt(projection, DAY))).toEqual({ a: 100_000, b: 500_000 })
	})

	// A net below zero draws the `withdraw` list first: the 80,000 bill takes `a`, then the transfer of all of it moves the 20,000 left.
	it("draws the withdraw list before moving, when the date's net is below zero", () => {
		const projection = projected({
			...YEAR,
			accounts: [a, b],
			balances: { a: 100_000 },
			flows: [
				expense("bill", 80_000, { start: DAY }),
				transferAll("move", "a", "b", { start: DAY }),
			],
			surplus: [{ account: "a" }],
			withdraw: ["a", "b"],
		})
		expect(amounts(rowAt(projection, DAY))).toEqual({ a: 0, b: 20_000 })
		expect(projection.runsOut).toBeUndefined()
	})

	// Cash 100,000, an 80,000 bill and a fixed 50,000 transfer: the bill is paid, the transfer moves the 20,000 left and no Shortfall follows.
	it("never turns a bill the plan can pay into a Shortfall, and reports what it could not move", () => {
		const projection = projected(
			{
				...YEAR,
				accounts: [a, b],
				balances: { a: 100_000 },
				flows: [
					expense("bill", 80_000, { start: DAY }),
					transfer("move", "a", "b", 50_000, { start: DAY }),
				],
				surplus: [{ account: "a" }],
				withdraw: ["a"],
			},
			{ cashflowBreakdown: true },
		)
		expect(projection.runsOut).toBeUndefined()
		expect(amounts(rowAt(projection, DAY))).toEqual({ a: 0, b: 20_000 })
		expect(projection.cashflow![0]!.transfers).toEqual([
			{ flow: "move", source: "a", target: "b", amount: 20_000, unmoved: 30_000 },
		])
		expect(projection.cashflow![0]!.unmet).toBe(0)
	})

	// `a` holds 100,000 and Scenario order is z-first then a-second: 70,000 to b, then the 30,000 left to c.
	it("applies two transfers of one date in Scenario order, never overdrawing", () => {
		const projection = projected({
			...YEAR,
			accounts: [a, b, c],
			balances: { a: 100_000 },
			flows: [
				transfer("z-first", "a", "b", 70_000, { start: DAY }),
				transfer("a-second", "a", "c", 70_000, { start: DAY }),
			],
			surplus: [{ account: "a" }],
		})
		expect(amounts(rowAt(projection, DAY))).toEqual({ a: 0, b: 70_000, c: 30_000 })
	})

	// An employer share of 50,000 lands in `a` first (ADR 0026), so a transfer of 120,000 from `a` holding 100,000 moves it all.
	it("moves an employer share that landed the same date", () => {
		const projection = projected({
			...YEAR,
			accounts: [a, b],
			balances: { a: 100_000 },
			flows: [
				employerShare("pvd", "a", 50_000, { start: DAY }),
				transfer("move", "a", "b", 120_000, { start: DAY }),
			],
			surplus: [{ account: "a" }],
		})
		expect(amounts(rowAt(projection, DAY))).toEqual({ a: 30_000, b: 120_000 })
	})
})
