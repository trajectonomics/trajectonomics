import { describe, expect, it } from "bun:test"
import { project } from "./project"
import { withdrawal } from "./test-assets"
import { employerShare } from "./test-employer"
import { chargingSetup, fund } from "./test-fee"
import { expense } from "./test-flows"
import { amounts, makeFixture, rowAt } from "./test-helpers"
import { fund as payingFund, projected } from "./test-payout"

const balanceOf = (projection: ReturnType<typeof projected>, date: string, account: string) =>
	rowAt(projection, date).balances.find((balance) => balance.account === account)!

describe("a fee of 0 bps", () => {
	it("gives a Projection byte for byte equal to the Account without a fee, with no `fees`", () => {
		const options = { cashflowBreakdown: true }
		const plain = projected(chargingSetup([{ id: "fund", kind: "asset", rate: 800 }]), options)
		const zero = projected(chargingSetup([fund({ bps: 0 }, { rate: 800 })]), options)
		expect(JSON.stringify(zero)).toBe(JSON.stringify(plain))
		expect(zero.annual[0]).not.toHaveProperty("fees")
	})
})

describe("what a fee is charged on", () => {
	it("charges a locked Account: the first month end takes 1,250,000", () => {
		const locked = projected(chargingSetup([fund({}, { lockedUntil: "2030-01-01" })]))
		expect(amounts(rowAt(locked, "2026-01-31"))["fund"]).toBe(998_750_000)
	})

	it("charges an Illiquid asset, which stays out of Accessible net worth", () => {
		const home = projected(chargingSetup([fund({}, { liquid: false })]))
		expect(amounts(rowAt(home, "2026-01-31"))["fund"]).toBe(998_750_000)
		expect(rowAt(home, "2026-01-31").accessibleNetWorth).toBe(0)
	})

	it("reads Accrued interest: 1,000,000,000 + 9,863,014 at 1200 bps over 30 days, / 800 = 1,262,329", () => {
		// 1,000,000,000 x 1200 x 30 / (10000 x 365) = 9,863,013.7: the fee is 1,009,863,014 / 800 = 1,262,328.77.
		const nominal = projected(
			chargingSetup([fund({}, { rate: 1200, compounding: "annual" })], { resolution: "day" }),
		)
		expect(balanceOf(nominal, "2026-01-31", "fund")).toMatchObject({
			capitalised: 998_737_671,
			accruedInterest: 9_863_014,
		})
	})
})

describe("the dates of a fee", () => {
	const falls = (setup: ReturnType<typeof chargingSetup>) => {
		const projection = projected(setup)
		const funds = projection.rows.map((row) => amounts(row)["fund"]!)
		return projection.rows
			.filter((_row, i) => i > 0 && funds[i]! < funds[i - 1]!)
			.map((r) => r.date)
	}

	it("lands on the Business day after a closed month end, like any Occurrence", () => {
		// 31 Jan and 28 Feb 2026 are Saturdays: those fees land on Monday 2 Feb and Monday 2 Mar.
		const calendar = { dayRule: "next", holidays: [] } as const
		const setup = chargingSetup([fund()], { resolution: "day", horizon: "2026-03-31", calendar })
		expect(falls(setup)).toEqual(["2026-02-02", "2026-03-02", "2026-03-31"])
	})

	it("charges a month end that is the Timeline start, then the next: 1,250,000 + 1,248,438", () => {
		const setup = chargingSetup([fund()], { start: "2026-01-31", horizon: "2026-02-28" })
		expect(projected(setup).annual[0]?.fees).toBe(2_498_438)
	})
})

describe("the order on a date", () => {
	it("is taken last, capped at what the Account holds: an annual payout of all of it leaves no fee", () => {
		// Eleven fees come to 13,664,385; on 31 Dec the payout pays all 986,335,615 and nothing is left to charge.
		const setup = chargingSetup([
			payingFund({ bps: 10_000, frequency: "annual" }, { fee: { bps: 150, rounding: "halfUp" } }),
		])
		const projection = projected(setup)
		expect(amounts(rowAt(projection, "2026-12-31"))).toEqual({ cash: 986_335_615, fund: 0 })
		expect(projection.annual[0]?.fees).toBe(13_664_385)
	})

	it("is taken after a sale: a sale of the whole Account on a fee date sells it all, and no fee is left", () => {
		// 997,501,562 after the 31 Jan and 28 Feb fees (1,250,000 + 1,248,438); 31 Mar's is read, then nothing remains.
		const sale = withdrawal("sale", "fund", 2_000_000_000, { start: "2026-03-31" })
		const projection = projected(chargingSetup([fund()], { flows: [sale] }))
		expect(amounts(rowAt(projection, "2026-03-31"))).toEqual({ cash: 997_501_562, fund: 0 })
		expect(projection.annual[0]?.fees).toBe(2_498_438)
	})

	it("reads the value before an employer share lands, and the share lands whole: 31 Mar", () => {
		// 997,501,562 / 800 = 1,246,876.95 -> 1,246,877, though 10,000,000 lands the same day.
		const share = employerShare("er", "fund", 10_000_000, {
			frequency: "once",
			start: "2026-03-31",
		})
		const projection = projected(chargingSetup([fund()], { flows: [share], horizon: "2026-03-31" }))
		expect(amounts(rowAt(projection, "2026-03-31"))["fund"]).toBe(1_006_254_685)
	})

	it("never causes a Shortfall: an expense that takes all 1,000 on a fee date is met, the fee is 0", () => {
		// 1,000 at 10000 bps owes 83 on 31 Jan, read before the 1,000 expense is drawn from the fund.
		const need = expense("need", 1000, { frequency: "once", start: "2026-01-31" })
		const setup = chargingSetup([fund({ bps: 10_000 })], {
			balances: { cash: 0, fund: 1000 },
			flows: [need],
			withdraw: ["fund"],
			horizon: "2026-02-28",
		})
		const projection = projected(setup)
		expect(projection.runsOut).toBeUndefined()
		expect(amounts(rowAt(projection, "2026-01-31"))["fund"]).toBe(0)
		expect(projection.annual[0]).toMatchObject({ expense: 1000, unmet: 0, fees: 0 })
	})
})

describe("the estate statement", () => {
	it("reads the rows, so it states the Account after its fees: 1,000,000,000 - 14,897,305", () => {
		const { baseline, scenario, timeline } = makeFixture(chargingSetup([fund()]))
		const result = project(baseline, scenario, timeline, { estate: true })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const last = result.projection.estate!.at(-1)!
		expect([last.date, last.gross]).toEqual(["2026-12-31", 985_102_695])
	})
})
