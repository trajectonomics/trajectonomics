// Where money goes against the real traj (web ADR 0021, cli ADR 0070, sim ADR 0030 and 0031): an emergency-fund target in
// today's money, a 30 per cent share step, a reserve floor and a PVD to RMF transfer are each one apply-plan Edit; a
// reorder changes the figures; a floor is tried in a What-if session that keeps the earlier tries; a refusal lands on its row.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { sessionWith } from "../src/lib/view/routing/change"
import { filledFigure, movedFigure } from "../src/lib/view/routing/figures"
import { moved } from "../src/lib/view/routing/order"
import { placeOf } from "../src/lib/view/routing/refusal"
import { stepDraftOf, stepFromDraft, withStep } from "../src/lib/view/routing/surplus"
import { transferFromDraft } from "../src/lib/view/routing/transfer-build"
import { transferDraftOf } from "../src/lib/view/routing/transfer-draft"
import { entryDraftOf, entryFromDraft, withEntry } from "../src/lib/view/routing/withdraw"
import { shownPlan } from "../src/lib/what-if/routing"
import { startWhatIf } from "../src/lib/what-if/session"
import { disposeAssumptions, ids, tryWhatIf } from "./assumptions-ledger.test-support"
import { SLOW_MS } from "./edit-fixture.test-support"
import {
	PLAN,
	post,
	prepare,
	runOf,
	save,
	setupRouting,
	storedPlan,
} from "./routing-ledger.test-support"

beforeAll(async () => {
	await setupRouting()
	await prepare()
}, SLOW_MS)
afterAll(disposeAssumptions)

const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)
const steps = () => storedPlan().document.cashflow?.surplus ?? []

describe("Where money goes through traj", () => {
	slow(
		"a target in today's money, a share step and a floor are each one Edit, and the echo states them",
		async () => {
			const { bank, fund } = ids()
			const target = stepFromDraft({
				...stepDraftOf(),
				account: "emergency",
				how: "upTo",
				amount: "100000",
				real: true,
			})
			if (!target.ok) throw new Error("refused")
			const one = await save({
				kind: "list",
				list: "surplus",
				items: withStep(steps(), null, target.step),
			})
			expect(steps()).toEqual([
				{ account: "emergency", upTo: { amount: "100000.00", growth: "inflation" } },
				{ account: bank },
			])
			expect(runOf(one).routing?.surplus[0]).toMatchObject({
				account: "emergency",
				upTo: { amount: "100000.00", growth: "inflation" },
			})
			const share = stepFromDraft({ ...stepDraftOf(), account: fund, how: "share", share: "30" })
			if (!share.ok) throw new Error("refused")
			await save({ kind: "list", list: "surplus", items: withStep(steps(), null, share.step) })
			expect(steps().map((step) => [step.account, step.share ?? null])).toEqual([
				["emergency", null],
				[fund, "30.00"],
				[bank, null],
			])
			const floor = entryFromDraft({
				...entryDraftOf(),
				account: bank,
				floor: true,
				amount: "10000",
			})
			if (!floor.ok) throw new Error("refused")
			const list = storedPlan().document.cashflow?.withdraw ?? []
			await save({ kind: "list", list: "withdraw", items: withEntry(list, 0, floor.entry) })
			expect(storedPlan().document.cashflow?.withdraw).toEqual([
				{ account: bank, downTo: "10000.00" },
				fund,
				bank,
			])
		},
	)

	slow("a PVD to RMF transfer moves money and the run states it by year", async () => {
		const draft = {
			...transferDraftOf(undefined, { milestones: [], anchors: [], asOf: "2027-01-01" }),
			source: "pvd",
			target: "rmf",
			date: "2028-01-01",
		}
		const made = transferFromDraft(draft, {
			taken: [],
			ctx: { milestones: [], anchors: [], asOf: "2027-01-01" },
		})
		if (!made.ok) throw new Error("refused")
		const answer = await save({ kind: "transfer", flow: made.flow })
		expect(storedPlan().document.flows.find((flow) => flow.kind === "transfer")).toMatchObject({
			source: "pvd",
			target: "rmf",
		})
		expect(movedFigure(runOf(answer)).series.map((one) => one.name)).toEqual([made.flow.id])
	})

	slow("a reorder of two steps writes the new order and the figures change", async () => {
		const before = runOf(await post("reread", {}))
		const answer = await save({ kind: "list", list: "surplus", items: moved(steps(), 0, 1) })
		expect(steps()[1]?.account).toBe("emergency")
		const after = runOf(answer)
		expect(
			filledFigure(after, new Map()).series.map((one) => one.points.map((point) => point.display)),
		).not.toEqual(
			filledFigure(before, new Map()).series.map((one) => one.points.map((point) => point.display)),
		)
	})

	slow(
		"a floor is tried in a What-if session that keeps the earlier tries, and nothing is written",
		async () => {
			const stored = storedPlan()
			const { bank } = ids()
			const floor = { account: bank, downTo: "50000.00" }
			const withdraw = [floor, ...(stored.document.cashflow?.withdraw ?? []).slice(1)]
			const one = sessionWith(startWhatIf(PLAN, stored.hash), stored.document, {
				kind: "list",
				list: "withdraw",
				items: withdraw,
			})
			const shown = shownPlan(stored.document, one)
			const surplus = moved(shown.cashflow?.surplus ?? [], 0, 1)
			const two = sessionWith(one, stored.document, {
				kind: "list",
				list: "surplus",
				items: surplus,
			})
			expect(two.sets.map((set) => set.path)).toEqual(["cashflow.withdraw", "cashflow.surplus"])
			const answer = await tryWhatIf({ plan: PLAN, sets: two.sets, removals: [], additions: [] })
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.reads.projection?.ok).toBe(true)
			expect(storedPlan()).toEqual(stored)
		},
	)

	slow("a refusal lands on the row its path names, positional paths included", async () => {
		const before = storedPlan()
		const { bank } = ids()
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
