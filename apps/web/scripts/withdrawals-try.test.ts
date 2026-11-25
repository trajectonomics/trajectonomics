// Trying another way on the Withdrawals page, and keeping it, against the real traj (cli ADR 0062, 0063; web ADR 0010, 0013).
// Each test saves the rule it needs first, so any of them passes when run alone.
import { afterAll, afterEach, beforeAll, describe, expect } from "bun:test"
import { withdrawalsView } from "../src/lib/view/withdrawals"
import { draftOf } from "../src/lib/view/withdrawals/draft"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import {
	contextOf,
	guardrails,
	ID,
	runOf,
	save,
	slow,
	tryDraft,
	withSavedRule,
} from "./withdrawals.test-support"
import { disposeWithdrawals, setupWithdrawals, storedPlan } from "./withdrawals-ledger.test-support"
import { post } from "./withdrawals-requests.test-support"

beforeAll(async () => {
	await setupWithdrawals()
}, SLOW_MS)
afterAll(disposeWithdrawals)
afterEach(settle, SLOW_MS)

describe("trying another way, and keeping it", () => {
	slow(
		"a lower share is a Set of the rule: 3% of 1,393,400.00 is 41,802.00, and nothing is written",
		async () => {
			await withSavedRule()
			const before = storedPlan()
			const { session, lens } = await tryDraft(guardrails(contextOf(), { rate: "3", stops: [] }))
			expect(session.sets.map((set) => set.path)).toEqual([`flows.${ID}.rule`])
			expect(lens.run).not.toBeNull()
			expect(withdrawalsView(lens.run, lens.chance).rules[0]?.rows[0]).toMatchObject({
				portfolio: "1393400.00",
				amount: "41802.00",
				share: "3.00%",
			})
			expect(withdrawalsView(lens.run, lens.chance).chance?.paths).toBeGreaterThan(0)
			expect(storedPlan()).toEqual(before)
		},
	)

	slow(
		"a level amount is one Set of the whole stored Flow: the rule's years are gone, the chance is stated, the rule stays saved",
		async () => {
			await withSavedRule()
			const { session, lens } = await tryDraft({
				...guardrails(contextOf(), { stops: [] }),
				how: "level",
				amount: "5000.00",
				frequency: "annual",
			})
			expect(session.sets.map((set) => set.path)).toEqual([`flows.${ID}`])
			expect(session.removals).toEqual([])
			expect(session.additions).toEqual([])
			const view = withdrawalsView(lens.run, lens.chance)
			expect(view.rules).toEqual([])
			expect(view.bands).toBeNull()
			expect(view.chance).not.toBeNull()
			expect(storedPlan().document.flows.find((flow) => flow.id === ID)?.rule).toBeDefined()
		},
	)

	slow(
		"a stop ticked is one Set of the gym with its end: the next year reads 1,337,664.00, and the gym is saved as it was",
		async () => {
			await withSavedRule()
			// The form opens on the saved rule as it stands, so only the stop differs from the plan.
			const ctx = contextOf()
			const saved = ctx.doc.flows.find((flow) => flow.id === ID)
			const { session, lens } = await tryDraft({ ...draftOf(saved, ctx), stops: ["gym"] })
			expect(session.sets.map((set) => set.path)).toEqual(["flows.gym"])
			expect(withdrawalsView(lens.run, lens.chance).rules[0]?.rows[1]?.portfolio).toBe("1337664.00")
			expect(storedPlan().document.flows.find((flow) => flow.id === "gym")?.endAt).toBeUndefined()
		},
	)

	slow(
		"saving the level amount writes a plain expense that follows inflation, and the form reads it back as one",
		async () => {
			const run = runOf(await post("reread", {}))
			const ctx = contextOf(run)
			const { answer } = await save(
				{ ...guardrails(ctx), how: "level", amount: "5000.00", frequency: "annual" },
				run,
			)
			expect(answer.ok).toBe(true)
			const flow = storedPlan().document.flows.find((one) => one.id === ID)
			expect(flow).toMatchObject({ amount: "5000.00", growth: "inflation", startAt: "retire" })
			expect(flow?.rule).toBeUndefined()
			expect(draftOf(flow, contextOf(run))).toMatchObject({ how: "level", amount: "5000.00" })
		},
	)
})
