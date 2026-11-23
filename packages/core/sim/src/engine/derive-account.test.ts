import { describe, expect, it } from "bun:test"
import type { Account, Derive, Flow } from "../types"
import { derivedExpense } from "./test-flows"
import { amounts, problems, rowAt, run, type Setup } from "./test-helpers"

const ACCOUNTS = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "home", kind: "asset", rate: 300 },
	{ id: "loan", kind: "liability", rate: 0 },
] as const satisfies readonly Account[]

/**
 * 1% a year of an Account's value, read once a month (ADR 0020): `scale` by 100 / 120000, so every
 * number is the caller's. The value is read before the Landed date's Flows, with growth to that date.
 */
function upkeep(account: string, num = 100, den = 120_000): Derive {
	return {
		measures: [
			{ id: "value", op: "account", account },
			{ id: "share", op: "scale", of: "value", num, den, rounding: "halfUp" },
		],
		result: "share",
	}
}

const once = (id: string, date: string, derive: Derive): Flow =>
	derivedExpense(id, derive, { frequency: "once", start: date })

function setup(flows: readonly Flow[], rate = 300, extra: Partial<Setup> = {}): Setup {
	return {
		accounts: ACCOUNTS.map((account) => (account.id === "home" ? { ...account, rate } : account)),
		balances: { cash: 1_000_000_000, home: 500_000_000, loan: 1_000_000 },
		flows,
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2027-01-01",
		resolution: "day",
		...extra,
	}
}

describe("a Derived amount that reads an Account's value", () => {
	it("reads month 1 with no growth: 500,000,000 x 100 / 120000 rounds to 416,667", () => {
		const projection = run(setup([once("month1", "2026-01-01", upkeep("home"))]))
		// Cash starts at 1,000,000,000; 500,000,000 x 100 / 120000 = 416,666.67, halfUp 416,667.
		expect(amounts(rowAt(projection, "2026-01-01"))).toEqual({
			cash: 999_583_333,
			home: 500_000_000,
			loan: 1_000_000,
		})
	})

	it("reads month 13 after one exact year of 3%: 515,000,000 x 100 / 120000 rounds to 429,167", () => {
		const projection = run(setup([once("month13", "2027-01-01", upkeep("home"))]))
		// 365 counted days from 2026-01-01 is one whole year: 500,000,000 x 10300 / 10000 = 515,000,000.
		// Then 515,000,000 x 100 / 120000 = 429,166.67, halfUp 429,167.
		expect(amounts(rowAt(projection, "2027-01-01"))["cash"]).toBe(1_000_000_000 - 429_167)
	})

	it("reads a depreciating Account: 500,000,000 x 9700 / 10000 is 485,000,000, a share of 404,167", () => {
		const projection = run(setup([once("month13", "2027-01-01", upkeep("home"))], -300))
		// One whole year at -3%: 485,000,000 x 100 / 120000 = 404,166.67, halfUp 404,167.
		expect(amounts(rowAt(projection, "2027-01-01"))["cash"]).toBe(1_000_000_000 - 404_167)
	})

	it("gives two Flows that read one Account on one date the same value, whatever their order", () => {
		const first = once("a", "2026-01-01", upkeep("home"))
		const second = once("b", "2026-01-01", upkeep("home"))
		const forward = run(setup([first, second]))
		const reverse = run(setup([second, first]))
		// Each is 416,667 on the same opening value of 500,000,000.
		expect(amounts(rowAt(forward, "2026-01-01"))["cash"]).toBe(1_000_000_000 - 2 * 416_667)
		expect(amounts(rowAt(reverse, "2026-01-01"))["cash"]).toBe(1_000_000_000 - 2 * 416_667)
	})

	it("reads a locked and an illiquid Account at their full value", () => {
		const locked = setup([once("month1", "2026-01-01", upkeep("home"))], 300, {
			accounts: [
				ACCOUNTS[0],
				{ id: "home", kind: "asset", rate: 300, lockedUntil: "2030-01-01" },
				ACCOUNTS[2],
			],
		})
		const illiquid = setup([once("month1", "2026-01-01", upkeep("home"))], 300, {
			accounts: [ACCOUNTS[0], { id: "home", kind: "asset", rate: 300, liquid: false }, ACCOUNTS[2]],
		})
		expect(amounts(rowAt(run(locked), "2026-01-01"))["cash"]).toBe(1_000_000_000 - 416_667)
		expect(amounts(rowAt(run(illiquid), "2026-01-01"))["cash"]).toBe(1_000_000_000 - 416_667)
	})

	it("reads a liability as the positive amount owed: 1,000,000 x 100 / 120000 is 833", () => {
		const projection = run(setup([once("owed", "2026-01-01", upkeep("loan"))]))
		// 1,000,000 x 100 / 120000 = 833.33, halfUp 833.
		expect(amounts(rowAt(projection, "2026-01-01"))["cash"]).toBe(1_000_000_000 - 833)
	})

	it("reports an overflow instead of clamping it", () => {
		const big = setup([once("huge", "2026-01-01", upkeep("home", 100, 1))], 300, {
			balances: { cash: 1_000_000_000, home: 9_000_000_000_000_000, loan: 0 },
		})
		// 9e15 x 100 is past the safe integer range, so the run refuses the date.
		expect(problems(big)).toContainEqual({ code: "VALUE_OVERFLOW", date: "2026-01-01" })
	})
})
