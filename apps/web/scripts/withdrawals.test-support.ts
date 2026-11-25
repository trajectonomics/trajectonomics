// What the withdrawals tests share: the page's own functions run against the scratch ledger and the real traj.
import { expect, test } from "bun:test"
import type { ProjectionRun } from "../src/lib/contract"
import type { EditAnswer } from "../src/lib/edit/answer"
import { milestoneDatesOf, type WithdrawalContext } from "../src/lib/view/withdrawals/context"
import { draftOf, type WithdrawalDraft } from "../src/lib/view/withdrawals/draft"
import { changedFlows, prepareWithdrawal } from "../src/lib/view/withdrawals/plan"
import { lensReadsOf } from "../src/lib/what-if/lens"
import { overridesOf, startWhatIf } from "../src/lib/what-if/session"
import { withTriedFlow } from "../src/lib/what-if/try-flow"
import { SLOW_MS } from "./edit-fixture.test-support"
import { AS_OF, PLAN, storedPlan } from "./withdrawals-ledger.test-support"
import { post, tryWhatIf } from "./withdrawals-requests.test-support"

export const ID = "retirement-spending"

/** A test against the real CLI: a fresh ledger takes a while per Edit. */
export const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)

export function snapshotOf(answer: EditAnswer) {
	if (!answer.ok) throw new Error(answer.error.message)
	return answer.snapshot
}

export function runOf(answer: EditAnswer): ProjectionRun {
	const read = snapshotOf(answer).reads.projections[PLAN]
	if (read === undefined || !read.ok) throw new Error("the plan has no projection")
	return read.data
}

/** The page's own context for the plan as the ledger holds it. */
export function contextOf(run: ProjectionRun | null = null): WithdrawalContext {
	return { doc: storedPlan().document, asOf: AS_OF, milestoneDates: milestoneDatesOf(run) }
}

/** A guardrails rule from the retirement Milestone: 4% of the savings, cut or raised by a tenth beyond a fifth. */
export function guardrails(
	ctx: WithdrawalContext,
	patch: Partial<WithdrawalDraft> = {},
): WithdrawalDraft {
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
export async function save(draft: WithdrawalDraft, run: ProjectionRun | null = null) {
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

/** Saves the 4% guardrails rule with nothing stopped, so a test needs no other test to have run before it. */
export async function withSavedRule(): Promise<ProjectionRun> {
	const run = runOf(await post("reread", {}))
	const { answer } = await save(guardrails(contextOf(run), { stops: [] }), run)
	expect(answer.ok).toBe(true)
	return runOf(answer)
}

/** Tries a draft as the form does: `changedFlows` against the saved plan, each Flow put in the session by `withTriedFlow`. */
export async function tryDraft(draft: WithdrawalDraft) {
	const ctx = contextOf()
	const made = prepareWithdrawal(
		draft,
		ctx,
		ctx.doc.flows.find((flow) => flow.id === ID),
	)
	if (!made.ok) throw new Error(JSON.stringify(made.problems))
	const session = changedFlows(ctx.doc, made.document).reduce(
		withTriedFlow,
		startWhatIf(PLAN, storedPlan().hash),
	)
	const answer = await tryWhatIf({ plan: PLAN, ...overridesOf(session) })
	return { session, lens: lensReadsOf(answer) }
}
