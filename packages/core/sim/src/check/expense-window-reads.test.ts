import { describe, expect, it } from "bun:test"
import { check } from "./index"

const baseline = {
	schemaVersion: 1,
	balances: [
		{ account: "cash", amount: 5_000_000_000 },
		{ account: "home", amount: 500_000_000 },
		{ account: "loan", amount: 100_000_000 },
	],
}
const timeline = { start: "2026-01-01", horizon: "2031-01-01", resolution: "month" }
const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "home", kind: "asset", rate: 300 },
	{ id: "fund", kind: "asset", rate: 0 },
	{ id: "loan", kind: "liability", rate: 400 },
]
const monthly = { frequency: "monthly", start: "2026-01-01" }
const upkeepOf = (account: string) => ({
	id: "upkeep",
	kind: "expense",
	...monthly,
	derive: {
		measures: [
			{ id: "value", op: "account", account },
			{ id: "share", op: "scale", of: "value", num: 100, den: 120_000, rounding: "halfUp" },
		],
		result: "share",
	},
})
const living = { id: "living", kind: "expense", amount: 100_000, growth: { bps: 0 }, ...monthly }
const once = { frequency: "once", start: "2026-06-01", amount: 1_000_000, growth: { bps: 0 } }
const NEXT = { expenses: "next12Months" }
const cheap = (criterion: Record<string, unknown>) => ({
	id: "cheap",
	combine: "all",
	criteria: [{ id: "low", terms: "nominal", ...criterion }],
})
const metric = cheap({ kind: "metric", metric: NEXT, op: "atMost", amount: 2_000_000 })
const multiple = cheap({
	kind: "multiple",
	metric: { accounts: ["cash"] },
	op: "atLeast",
	base: NEXT,
	num: 25,
	den: 1,
})
interface Moves {
	readonly surplus: readonly { readonly account: string }[]
	readonly contribute: readonly string[]
	readonly withdraw: readonly string[]
}
const cashflow: Moves = { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] }

function codes(
	flows: readonly object[],
	milestone: object,
	moves: Partial<Moves> = {},
): readonly string[] {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows,
		milestones: [milestone],
		cashflow: { ...cashflow, ...moves },
	}
	return check(baseline, scenario, timeline).map((item) => item.code)
}

describe("a next-12-months expense Milestone beside a Derived amount that reads an Account", () => {
	describe("is accepted when nothing can change the Account", () => {
		it("accepts a home already owned, never bought or sold, that only its upkeep reads", () => {
			expect(codes([living, upkeepOf("home")], metric)).toEqual([])
		})

		it("accepts the same for a multiple's base window", () => {
			expect(codes([living, upkeepOf("home")], multiple)).toEqual([])
		})

		it("accepts a loan nothing pays or draws, which only accrues its rate", () => {
			expect(codes([living, upkeepOf("loan")], metric)).toEqual([])
		})

		it("accepts a read while a different Account is bought into", () => {
			const save = { id: "save", kind: "contribution", target: "fund", ...once }
			expect(codes([living, upkeepOf("home"), save], metric, { contribute: ["fund"] })).toEqual([])
		})
	})

	describe("is refused when the Account can change on a future date", () => {
		const refused = ["NEXT_12_MONTHS_READS_ACCOUNT"]
		const buy = { id: "home-purchase", kind: "contribution", target: "home", ...once }
		const sell = { id: "home-sale", kind: "withdrawal", source: "home", ...once }
		const pay = { id: "pay", kind: "contribution", target: "loan", ...once }
		const draw = { id: "draw", kind: "withdrawal", source: "loan", ...once }
		const read = (account: string) => [living, upkeepOf(account)]

		it("refuses a home with a purchase in the plan", () => {
			expect(codes([...read("home"), buy], metric, { contribute: ["home"] })).toEqual(refused)
		})

		it("refuses a home with a sale in the plan", () => {
			expect(codes([...read("home"), sell], metric)).toEqual(refused)
		})

		it("refuses a loan with a payment or a draw in the plan", () => {
			expect(codes([...read("loan"), pay], metric)).toEqual(refused)
			expect(codes([...read("loan"), draw], metric)).toEqual(refused)
		})

		it("refuses an Account named by cashflow.surplus, contribute or withdraw", () => {
			expect(codes(read("home"), metric, { surplus: [{ account: "home" }] })).toEqual(refused)
			expect(codes(read("home"), metric, { contribute: ["home"] })).toEqual(refused)
			expect(codes(read("home"), metric, { withdraw: ["cash", "home"] })).toEqual(refused)
		})

		it("reports the Metric's expenses key, and the base's for a multiple", () => {
			const found = check(
				baseline,
				{
					schemaVersion: 4,
					currency: "THB",
					economy: { inflation: 0 },
					accounts,
					flows: [...read("home"), sell],
					milestones: [multiple],
					cashflow,
				},
				timeline,
			)
			expect(found).toEqual([
				{
					code: "NEXT_12_MONTHS_READS_ACCOUNT",
					path: ["scenario", "milestones", 0, "criteria", 0, "base", "expenses"],
				},
			])
		})
	})
})
