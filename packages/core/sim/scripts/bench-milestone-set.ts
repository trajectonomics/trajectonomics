// The Milestones and the Market model that bench-milestones.ts times.

import { thaiEmployee } from "../src/fixtures/thai-employee"
import type { Milestone, ReturnModel } from "../src/types"

const { scenario } = thaiEmployee
const never = 900_000_000_000_000

export const balance: Milestone = {
	id: "rich",
	combine: "all",
	criteria: [
		{ id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount: never, terms: "nominal" },
	],
}
export const window: Milestone = {
	id: "covered",
	combine: "all",
	criteria: [
		{
			id: "c",
			kind: "multiple",
			metric: "accessibleNetWorth",
			op: "atLeast",
			base: { expenses: "next12Months" },
			num: 1_000_000,
			den: 1,
			terms: "real",
		},
	],
}
export const accounts: Milestone = {
	id: "funded",
	combine: "any",
	criteria: [
		{
			id: "c",
			kind: "metric",
			metric: { accounts: ["rmf", "emergency-fund"] },
			op: "atLeast",
			amount: never,
			terms: "nominal",
		},
	],
}
export const model: ReturnModel = {
	id: "bench",
	accounts: scenario.accounts.map((account) => account.id),
	buckets: [
		{ returnsBps: [20, 40, 110, 0], weight: 3221225472 },
		{ returnsBps: [-40, -60, -120, 0], weight: 1073741824 },
	],
}
