// The Withdrawals page against the real traj: a plan worked by hand, a rule set from the retirement Milestone, its years
// and Bands read back, and another way tried in a what-if (cli ADR 0063, web ADR 0013).
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import type { ProjectionRun } from "../src/lib/contract"
import type { EditAnswer } from "../src/lib/edit/answer"
import { withdrawalsView } from "../src/lib/view/withdrawals"
import { milestoneDatesOf, type WithdrawalContext } from "../src/lib/view/withdrawals/context"
import { draftOf, type WithdrawalDraft } from "../src/lib/view/withdrawals/draft"
import { prepareWithdrawal } from "../src/lib/view/withdrawals/plan"
import { readsOf } from "../src/lib/what-if/lens"
import { SLOW_MS } from "./edit-fixture.test-support"
import {
	AS_OF,
	disposeWithdrawals,
	PLAN,
	setupWithdrawals,
	storedPlan,
} from "./withdrawals-ledger.test-support"
import { post, tryWhatIf } from "./withdrawals-requests.test-support"

const ID = "retirement-spending"

/** A test against the real CLI: a fresh ledger takes a while per Edit. */
const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)

beforeAll(async () => {
	await setupWithdrawals()
}, SLOW_MS)
afterAll(disposeWithdrawals)

function snapshotOf(answer: EditAnswer) {
	if (!answer.ok) throw new Error(answer.error.message)
	return answer.snapshot
}

function runOf(answer: EditAnswer): ProjectionRun {
	const read = snapshotOf(answer).reads.projections[PLAN]
	if (read === undefined || !read.ok) throw new Error("the plan has no projection")
	return read.data
}

/** The page's own context for the plan as the ledger holds it. */
function contextOf(run: ProjectionRun | null = null): WithdrawalContext {
	return { doc: storedPlan().document, asOf: AS_OF, milestoneDates: milestoneDatesOf(run) }
}

/** A guardrails rule from the retirement Milestone: 4% of the savings, cut or raised by a tenth beyond a fifth. */
function guardrails(ctx: WithdrawalContext, patch: Partial<WithdrawalDraft> = {}): WithdrawalDraft {
	return {
		...draftOf(
			storedPlan().document.flows.find((flow) => flow.id === ID),
			ctx,
		),
		how: "guardrails",
		frequency: "monthly",
		rate: "4",
		rounding: "floor",
		upper: { band: "20", move: "10" },
		lower: { band: "20", move: "10" },
		...patch,
	}
}

/** Saves a draft with the page's own functions: one `apply-plan` Edit that names the hash it read. */
async function save(draft: WithdrawalDraft, run: ProjectionRun | null = null) {
	const ctx = contextOf(run)
	const existing = ctx.doc.flows.find((flow) => flow.id === ID)
	const result = prepareWithdrawal(draft, ctx, existing)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const answer = await post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: storedPlan().hash,
		document: result.document,
	})
	return { answer, result }
}

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

describe("trying another way, and keeping it", () => {
	slow(
		"a lower share is a Set of the rule: 3% of 1,393,400.00 is 41,802.00, and nothing is written",
		async () => {
			const before = storedPlan()
			const ctx = contextOf()
			const edited = prepareWithdrawal(
				guardrails(ctx, { rate: "3", stops: ["gym"] }),
				ctx,
				ctx.doc.flows.find((flow) => flow.id === ID),
			)
			if (!edited.ok) throw new Error("not made")
			const tried = await tryWhatIf({
				plan: PLAN,
				sets: [{ path: `flows.${ID}.rule`, value: JSON.parse(JSON.stringify(edited.flow.rule)) }],
				removals: [],
			})
			const lens = readsOf(tried)
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
		"a level amount is a Removal and an Addition: the chance is stated beside the rule's, and the rule stays saved",
		async () => {
			const ctx = contextOf()
			const level = prepareWithdrawal(
				{ ...guardrails(ctx), how: "level", amount: "5000.00", frequency: "annual" },
				ctx,
				undefined,
			)
			if (!level.ok) throw new Error("not made")
			const item = JSON.parse(JSON.stringify(level.flow))
			const tried = await tryWhatIf({
				plan: PLAN,
				sets: [],
				removals: [`flows.${ID}`],
				additions: [{ list: "flows", item }],
			})
			const lens = readsOf(tried)
			const view = withdrawalsView(lens.run, lens.chance)
			expect(view.rules).toEqual([])
			expect(view.bands).toBeNull()
			expect(view.chance).not.toBeNull()
			expect(storedPlan().document.flows.find((flow) => flow.id === ID)?.rule).toBeDefined()
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
