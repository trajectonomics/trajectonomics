import { describe, expect, it } from "bun:test"
import type { Account, Flow, Levy, Projection } from "../types"
import { saleOfAll } from "./test-assets"
import { derivedEmployerShare, employerShare, shareOf } from "./test-employer"
import { contribution, expense, income } from "./test-flows"
import {
	amounts,
	emptyCarryIn,
	periodFrom,
	rowAt,
	run,
	type Setup,
	withCarryIn,
} from "./test-helpers"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const pvd: Account = { id: "pvd", kind: "asset", rate: 0 }
const MONTHLY = { frequency: "monthly", start: "2026-01-31" } as const

function plan(flows: readonly Flow[], extra: Partial<Setup> = {}): Projection {
	return run({
		accounts: [cash, pvd],
		balances: { cash: 0, pvd: 0 },
		flows,
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2026-03-31",
		resolution: "month",
		...extra,
	})
}

describe("a fixed employer Contribution", () => {
	// 500,000.00 on each of 31 Jan, 28 Feb and 31 Mar lands in pvd with no income and no cash at all.
	const projection = plan([employerShare("pvd-employer", "pvd", 500_000, MONTHLY)])

	it("lands in full in the Account, though Available cashflow is zero and nothing routes it", () => {
		expect(amounts(rowAt(projection, "2026-03-31"))).toEqual({ cash: 0, pvd: 1_500_000 })
		expect(projection.runsOut).toBeUndefined()
	})

	it("is in no cash figure: not income, not a contribution, not unfunded, not interest", () => {
		expect(projection.annual[0]).toMatchObject({
			income: 0,
			expense: 0,
			contributions: 0,
			unfundedContributions: 0,
			employerContributions: 1_500_000,
			interest: 0,
			unmet: 0,
		})
	})
})

describe("a derived employer Contribution", () => {
	const salary = income("salary", 4_000_000, MONTHLY)
	const living = expense("living", 4_000_000, MONTHLY)
	const share = derivedEmployerShare("pvd-employer", "pvd", shareOf("salary", 5, 100), MONTHLY)

	it("lands 5% of the salary's gross, and changes no cash figure of the plan without it", () => {
		const without = plan([salary, living])
		const projection = plan([salary, living, share])
		// 5% of 4,000,000.00 is 200,000.00 on each of three months.
		expect(amounts(rowAt(projection, "2026-03-31"))).toEqual({ cash: 0, pvd: 600_000 })
		const cashFigures = ({
			income,
			expense,
			contributions,
			unfundedContributions,
			unmet,
		}: Projection["annual"][number]) => ({
			income,
			expense,
			contributions,
			unfundedContributions,
			unmet,
		})
		expect(cashFigures(projection.annual[0]!)).toEqual(cashFigures(without.annual[0]!))
		expect(cashFigures(without.annual[0]!)).toEqual({
			income: 12_000_000,
			expense: 12_000_000,
			contributions: 0,
			unfundedContributions: 0,
			unmet: 0,
		})
		expect(projection.annual[0]?.employerContributions).toBe(600_000)
	})

	it("does not raise the Available cashflow a member's own Contribution is capped by", () => {
		// Salary 5,000,000.00, living 4,000,000.00: 1,000,000.00 is available, and a 1,500,000.00 own
		// contribution lands 1,000,000.00 with 500,000.00 unfunded, with or without the employer's 250,000.00.
		const member = contribution("pvd-member", "pvd", 1_500_000, MONTHLY)
		const own = [
			income("salary", 5_000_000, MONTHLY),
			expense("living", 4_000_000, MONTHLY),
			member,
		]
		const derived = derivedEmployerShare("pvd-employer", "pvd", shareOf("salary", 5, 100), MONTHLY)
		const projection = plan([...own, derived], { contribute: ["pvd"], horizon: "2026-01-31" })
		expect(projection.annual[0]).toMatchObject({
			contributions: 1_000_000,
			unfundedContributions: 500_000,
			employerContributions: 250_000,
		})
		expect(amounts(rowAt(projection, "2026-01-31"))).toEqual({ cash: 0, pvd: 1_250_000 })
	})
})

describe("an employer Contribution into a gain-tracked Account", () => {
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
	const fund: Account = { ...pvd, gainLabel: "gain" }

	it("adds to the Cost basis, so selling the fund whole realises no gain on it", () => {
		// 3,000,000.00 on a 3,000,000.00 basis, plus 1,000,000.00 from the employer: the sale of 4,000,000.00
		// uses all 4,000,000.00 of basis. Had the employer's share not entered the basis, the gain would be 1,000,000.00.
		const projection = run({
			accounts: [cash, fund],
			balances: { cash: 0, pvd: 300_000_000 },
			basis: { pvd: 300_000_000 },
			flows: [
				employerShare("pvd-employer", "pvd", 100_000_000, { start: "2026-02-01" }),
				saleOfAll("sell", "pvd", { start: "2026-06-01" }),
			],
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			start: "2026-01-01",
			horizon: "2026-12-31",
			resolution: "month",
			levy: withCarryIn(gains, emptyCarryIn("2025-01-01")),
		})
		expect(amounts(rowAt(projection, "2026-12-31"))).toEqual({ cash: 400_000_000, pvd: 0 })
		const gain = periodFrom(projection, "2026-01-01").measures.find((m) => m.id === "gain")
		expect(gain?.value).toBe(0)
	})
})

describe("an employer Contribution and a Levy's funded Tally", () => {
	const funded = (label: string): Levy =>
		withCarryIn(
			{
				id: "funded-levy",
				period: { month: 1, day: 1 },
				settlement: { month: 3, day: 31 },
				measures: [{ id: "saved", op: "tally", label, basis: "funded" }],
				due: "saved",
			},
			emptyCarryIn("2025-01-01"),
		)
	const once = { start: "2026-01-02" } as const
	const tallied = (flows: readonly Flow[], label: string) =>
		periodFrom(
			plan(flows, { horizon: "2027-03-31", levy: funded(label), contribute: ["pvd"] }),
			"2026-01-01",
		).measures.find((measure) => measure.id === "saved")?.value

	// 1,000 of income leaves 1,000 available, so the member's own 100 is applied in full.
	const pay = income("pay", 1_000, once)
	const own = contribution("m", "pvd", 100, { ...once, label: "pvd.member" })

	it("is tallied under the label its author states, and a member's own label does not pick it up", () => {
		const labelled = employerShare("e", "pvd", 150, { ...once, label: "pvd.employer" })
		expect(tallied([labelled], "pvd.employer")).toBe(150)
		expect(tallied([pay, labelled, own], "pvd.member")).toBe(100)
	})

	it("is in no tally without a label, so a Levy counts only the member's own 100", () => {
		expect(tallied([pay, employerShare("e", "pvd", 150, once), own], "pvd.member")).toBe(100)
	})
})

describe("an employer Contribution into a locked Account", () => {
	it("lands, and stays out of accessible net worth until the unlock date", () => {
		const locked: Account = { ...pvd, lockedUntil: "2027-01-01" }
		const projection = plan([employerShare("pvd-employer", "pvd", 500_000, MONTHLY)], {
			accounts: [cash, locked],
		})
		const row = rowAt(projection, "2026-03-31")
		expect(amounts(row)).toEqual({ cash: 0, pvd: 1_500_000 })
		expect([row.netWorth, row.accessibleNetWorth]).toEqual([1_500_000, 0])
	})
})
