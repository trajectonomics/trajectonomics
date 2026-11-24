// Where money goes against the real traj, continued (web ADR 0022): a growth by a fixed rate round trips, and a refusal lands
// on the row its path names, positional paths included. Each test sets up its own state.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { placeOf } from "../src/lib/view/routing/refusal"
import { stepDraftOf, stepFromDraft, withStep } from "../src/lib/view/routing/surplus"
import { transferFromDraft } from "../src/lib/view/routing/transfer-build"
import { transferDraftOf } from "../src/lib/view/routing/transfer-draft"
import { disposeAssumptions, ids } from "./assumptions-ledger.test-support"
import { SLOW_MS } from "./edit-fixture.test-support"
import { prepare, save, setupRouting, storedPlan } from "./routing-ledger.test-support"

beforeAll(async () => {
	await setupRouting()
	await prepare()
}, SLOW_MS)
afterAll(disposeAssumptions)

const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)
const steps = () => storedPlan().document.cashflow?.surplus ?? []

describe("Where money goes through traj, continued", () => {
	slow(
		"a target that grows by a fixed rate is stored as basis points and an edit round trips it",
		async () => {
			const { fund } = ids()
			const draft = {
				...stepDraftOf(),
				account: fund,
				how: "upTo" as const,
				amount: "7000",
				growth: "fixed" as const,
				rate: "3",
			}
			const made = stepFromDraft(draft)
			if (!made.ok) throw new Error("refused")
			await save({ kind: "list", list: "surplus", items: withStep(steps(), null, made.step) })
			const stored = steps()[0]
			if (stored === undefined) throw new Error("the step is stored")
			expect(stored).toMatchObject({
				account: fund,
				upTo: { amount: "7000.00", growth: { bps: 300 } },
			})
			const again = stepFromDraft(stepDraftOf(stored), stored)
			expect(again).toEqual({ ok: true, step: stored })
			const answer = await save({
				kind: "list",
				list: "surplus",
				items: withStep(steps(), 0, stored),
			})
			expect(answer.ok).toBe(true)
			expect(steps()[0]).toEqual(stored)
		},
	)

	slow("a refusal lands on the row its path names, positional paths included", async () => {
		const { bank } = ids()
		const ctx = { milestones: [], anchors: [], asOf: "2027-01-01" }
		const move = transferFromDraft(
			{ ...transferDraftOf(undefined, ctx), source: "pvd", target: "rmf", date: "2028-01-01" },
			{ taken: [], ctx },
		)
		if (!move.ok) throw new Error("refused")
		await save({ kind: "transfer", flow: move.flow })
		const before = storedPlan()
		const last = await save({
			kind: "list",
			list: "surplus",
			items: [{ account: bank }, { account: "emergency", share: "10" }],
		})
		if (last.ok) throw new Error("the CLI took a share on the last step")
		expect(last.error.code).toBe("invalid_input")
		expect(placeOf(last.error, [])).toEqual({
			kind: "row",
			list: "surplus",
			index: 1,
			field: "share",
		})
		const order = await save({
			kind: "list",
			list: "withdraw",
			items: [bank, { account: bank, downTo: "5.00" }],
		})
		if (order.ok) throw new Error("the CLI took a floor after a plain entry")
		expect(placeOf(order.error, [])).toEqual({
			kind: "row",
			list: "withdraw",
			index: 1,
			field: "downTo",
		})
		const same = await save({
			kind: "transfer",
			flow: { ...before.document.flows.find((f) => f.kind === "transfer")!, target: "pvd" },
		})
		if (same.ok) throw new Error("the CLI took a move to its own source")
		expect(
			placeOf(
				same.error,
				before.document.flows.map((flow) => flow.id),
			),
		).toMatchObject({ kind: "flow", field: "target" })
		expect(storedPlan()).toEqual(before)
	})
})
