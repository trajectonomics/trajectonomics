// The Withdrawals page against the real traj: a plan worked by hand, a rule set from the retirement Milestone, and its
// years and Bands read back (cli ADR 0063, web ADR 0013). The tries are in `withdrawals-try.test.ts`.
import { afterAll, afterEach, beforeAll, describe, expect } from "bun:test"
import { withdrawalsView } from "../src/lib/view/withdrawals"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import {
	contextOf,
	guardrails,
	ID,
	runOf,
	save,
	slow,
	snapshotOf,
} from "./withdrawals.test-support"
import {
	disposeWithdrawals,
	PLAN,
	setupWithdrawals,
	storedPlan,
} from "./withdrawals-ledger.test-support"
import { post } from "./withdrawals-requests.test-support"

beforeAll(async () => {
	await setupWithdrawals()
}, SLOW_MS)
afterAll(disposeWithdrawals)
afterEach(settle, SLOW_MS)

describe("a plan with no rule", () => {
	slow("states an empty table of Rule years and no spending Bands", async () => {
		const answer = await post("reread", {})
		const view = withdrawalsView(runOf(answer), null)
		expect(view.rules).toEqual([])
		const chance = snapshotOf(answer).reads.chance[PLAN]
		expect(chance?.ok && chance.data.spendingBands).toBeUndefined()
	})
})

describe("a guardrails rule from the retirement Milestone, as worked by hand", () => {
	slow(
		"savings of 1,398,900.00 less 5,000.00 of rent and 500.00 of gym are 1,393,400.00 on 1 June 2027, and 4% of it is 55,736.00",
		async () => {
			const first = await post("reread", {})
			const ctx = contextOf(runOf(first))
			expect(ctx.milestoneDates["retire"]).toBe("2027-06-01")
			const { answer } = await save(guardrails(ctx), runOf(first))
			expect(answer.ok).toBe(true)
			const stored = storedPlan().document.flows.find((flow) => flow.id === ID)
			expect(stored).toMatchObject({ startAt: "retire", frequency: "monthly" })
			expect(stored?.rule).toMatchObject({ kind: "guardrails", rateBps: "4.00", rounding: "floor" })
			const [rule] = withdrawalsView(runOf(answer), null).rules
			expect(rule?.rows[0]).toMatchObject({
				from: "1 Jun 2027",
				portfolio: "1393400.00",
				amount: "55736.00",
				paid: "55736.00",
				realAmount: "55736.00",
				share: "4.00%",
				action: "Followed the rule",
			})
			// Rent has ended and the gym still runs: 55,736.00 and twelve gym payments come off the next year's savings.
			expect(rule?.rows[1]?.portfolio).toBe("1336464.00")
		},
	)

	slow(
		"stopping the gym at the Milestone keeps its 1,200.00 in the savings the next year reads",
		async () => {
			const run = runOf(await post("reread", {}))
			const { answer } = await save(guardrails(contextOf(run), { stops: ["gym"] }), run)
			expect(answer.ok).toBe(true)
			expect(storedPlan().document.flows.find((flow) => flow.id === "gym")?.endAt).toBe("retire")
			expect(withdrawalsView(runOf(answer), null).rules[0]?.rows[1]?.portfolio).toBe("1337664.00")
		},
	)

	slow(
		"the chance read states the spending Bands, and the lowest year counts its paths",
		async () => {
			const snapshot = snapshotOf(await post("reread", {}))
			const chance = snapshot.reads.chance[PLAN]
			if (chance === undefined || !chance.ok) throw new Error("no chance read")
			const bands = withdrawalsView(null, chance.data).bands
			expect(bands?.series.map((one) => one.points.length)).toEqual(
				[4, 4, 4, 4, 4].map(() => chance.data.bands.length),
			)
			expect(bands?.lowest.map((one) => one.level)).toEqual([10, 25, 50, 75, 90])
			expect(bands?.counted).toBeGreaterThan(0)
			expect(bands?.counted).toBeLessThanOrEqual(chance.data.paths)
		},
	)
})
