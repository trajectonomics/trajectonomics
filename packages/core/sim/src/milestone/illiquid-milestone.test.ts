import { describe, expect, it } from "bun:test"
import { income } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import type { Account, Criterion, Milestone } from "../types"
import { firedOn, milestoned } from "./test-milestones"

const cash = { id: "cash", kind: "asset", rate: 0 } as const

/**
 * Cash 0 and a home 6,000 on 1 Jan 2026. Salary 1,000 lands on each 1st, into cash. Each opening
 * valuation is taken before that day's flows, so on the 1st of month n the cash holds the salary
 * of the n − 1 months before it.
 */
function plan(home: Account): Setup {
	return {
		accounts: [cash, home],
		balances: { cash: 0, home: 6000 },
		flows: [income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2026-12-31",
	}
}

const marked = { id: "home", kind: "asset", rate: 0, liquid: false } as const
const unmarked = { id: "home", kind: "asset", rate: 0 } as const

function atLeast(id: string, metric: "netWorth" | "accessibleNetWorth", amount: number): Milestone {
	const criterion: Criterion = {
		id: "c",
		kind: "metric",
		metric,
		op: "atLeast",
		amount,
		terms: "nominal",
	}
	return { id, combine: "all", criteria: [criterion] }
}

describe("a Metric that reads accessible net worth fires later for a marked home", () => {
	it("fires the net worth Milestone on 1 Feb, whether or not the home is marked", () => {
		// Opening net worth: 1 Jan 6,000; 1 Feb 7,000 (January's salary). Net worth counts the home.
		const milestones = [atLeast("rich", "netWorth", 7000)]
		expect(firedOn(milestoned(plan(marked), milestones), "rich")).toBe("2026-02-01")
		expect(firedOn(milestoned(plan(unmarked), milestones), "rich")).toBe("2026-02-01")
	})

	it("fires the accessible Milestone on 1 Apr with the home marked, and on 1 Jan without it", () => {
		// Opening accessible net worth with the home marked is cash alone: 1 Mar 2,000, 1 Apr 3,000.
		// Unmarked, the home counts from 1 Jan: 6,000 ≥ 3,000 on the very first evaluation date.
		const milestones = [atLeast("invested", "accessibleNetWorth", 3000)]
		expect(firedOn(milestoned(plan(marked), milestones), "invested")).toBe("2026-04-01")
		expect(firedOn(milestoned(plan(unmarked), milestones), "invested")).toBe("2026-01-01")
	})
})
