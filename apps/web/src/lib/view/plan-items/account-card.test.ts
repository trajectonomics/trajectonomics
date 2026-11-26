import { describe, expect, test } from "bun:test"
import type { ScenarioAccount } from "../../contract"
import { scenarioAccount } from "../../contract"
import { itemNames } from "../item-names"
import { NO_INCOME_CONTEXT } from "./account-income"
import { accountLifetimesOf, accountYears } from "./account-years"
import { accountCards } from "./accounts"
import { baselineRead, planDocument } from "./fixtures.test-support"

const fund = (extra: Record<string, unknown> = {}): ScenarioAccount =>
	scenarioAccount.parse({ id: "fund", kind: "asset", rate: 600, ...extra })

const PAYS = {
	payout: {
		bps: "3.50",
		frequency: "quarterly",
		rounding: "floor",
		startAt: "retire",
		label: "income.section40_4.dividends",
	},
	fee: { bps: "1.50", rounding: "halfUp" },
}

describe("the Account card", () => {
	const doc = planDocument()
	const read = (account: ScenarioAccount, run?: Parameters<typeof accountCards>[2]) =>
		accountCards([account], baselineRead(), run)[0]

	test("reads 'Pays out 3.5% a year from retire' and 'Fee 1.5% a year', with how it is paid", () => {
		const card = read(fund(PAYS))
		expect(card?.payout?.text).toBe("Pays out 3.5% a year from retire")
		expect(card?.payoutHow).toBe("Paid quarterly, counted as dividends")
		expect(card?.fee).toBe("Fee 1.5% a year")
	})

	test("a payout that starts at a Milestone reads the name the plan states, or its id", () => {
		const names = itemNames(new Map(), null, {
			currency: "THB",
			accounts: [],
			flows: [],
			milestones: [{ id: "retire", displayLabel: "Retirement" }],
		})
		expect(accountCards([fund(PAYS)], baselineRead(), undefined, names)[0]?.payout?.text).toBe(
			"Pays out 3.5% a year from Retirement",
		)
		expect(read(fund(PAYS))?.payout?.text).toBe("Pays out 3.5% a year from retire")
	})

	test("a payout from a date says the date, and an Account with neither says nothing", () => {
		const dated = fund({
			payout: { bps: "4.00", frequency: "semiannual", rounding: "floor", start: "2030-01-01" },
		})
		expect(read(dated)?.payout?.text).toBe("Pays out 4% a year from 1 Jan 2030")
		expect(read(dated)?.payoutHow).toBe("Paid twice a year")
		expect(read(doc.accounts[0] as ScenarioAccount)).toMatchObject({
			payout: null,
			fee: null,
			years: [],
		})
	})

	test("the years are the CLI's own rows, each stated per roll-up and none added up", () => {
		const run = {
			tables: [
				{
					name: "fees",
					count: 2,
					rows: [
						{ index: 0, from: "2026-11-01", to: "2027-10-31", account: "fund", amount: "120.00" },
						{ index: 1, from: "2027-11-01", to: "2028-10-31", account: "fund", amount: "118.50" },
						{ index: 0, from: "2026-11-01", to: "2027-10-31", account: "other", amount: "9.00" },
					],
				},
				{
					name: "cashflow",
					count: 1,
					rows: [
						{
							index: 1,
							from: "2027-11-01",
							to: "2028-10-31",
							group: "payout",
							id: null,
							account: "fund",
							category: null,
							amount: "400.00",
						},
					],
				},
			],
		} as never
		expect(accountYears(run, "fund")).toEqual([
			{ index: 0, from: "2026-11-01", to: "2027-10-31", payout: null, fee: "120.00" },
			{ index: 1, from: "2027-11-01", to: "2028-10-31", payout: "400.00", fee: "118.50" },
		])
		expect(read(fund(PAYS), run)?.years).toHaveLength(2)
		expect(accountYears(undefined, "fund")).toEqual([])
		expect(NO_INCOME_CONTEXT.taxed).toBe(false)
	})
})

describe("the Account's totals over the plan", () => {
	const run = {
		accountLifetimes: [
			{ account: "fund", lifetimeFees: "238.50", lifetimePayouts: "400.00" },
			{ account: "fee-only", lifetimeFees: "9.00" },
		],
	} as never

	test("are the engine's figures for the Account, as stated and not summed from the years", () => {
		expect(accountLifetimesOf(run, "fund")).toEqual({ fees: "238.50", payouts: "400.00" })
		expect(accountLifetimesOf(run, "fee-only")).toEqual({ fees: "9.00", payouts: null })
		const card = accountCards([fund(PAYS)], baselineRead(), run)[0]
		expect(card).toMatchObject({ lifetimeFees: "238.50", lifetimePayouts: "400.00" })
	})

	test("are none for an Account the run states none for, and without a run", () => {
		expect(accountLifetimesOf(run, "bank")).toEqual({ fees: null, payouts: null })
		expect(accountLifetimesOf(undefined, "fund")).toEqual({ fees: null, payouts: null })
		expect(accountCards([fund({ id: "quiet" })], baselineRead(), run)[0]).toMatchObject({
			lifetimeFees: null,
			lifetimePayouts: null,
		})
	})
})
