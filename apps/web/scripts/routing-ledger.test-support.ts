// The plan the Where money goes end-to-end tests work (web ADR 0022): the withdrawals test's hand plan (no interest, no
// inflation stated as growth) with a salary that stops when `retire` fires, so money is left over before it and short after
// it, and three more Accounts: an emergency fund, a provident fund and an RMF.
import type { ProjectionRun, ScenarioDocument } from "../src/lib/contract"
import { documentWith, type RoutingChange } from "../src/lib/view/routing/change"
import { PLAN, post, setupAssumptions, storedPlan } from "./assumptions-ledger.test-support"

export { PLAN, post, storedPlan }
export const setupRouting = setupAssumptions

/** Adds the accounts and the salary to the stored plan, as one Edit. Returns the plan's document. */
export async function prepare(): Promise<ScenarioDocument> {
	const stored = storedPlan()
	const document = {
		...stored.document,
		cashflow: {
			...stored.document.cashflow,
			contribute: [...(stored.document.cashflow?.contribute ?? []), "pvd"],
		},
		accounts: [
			...stored.document.accounts,
			{ id: "emergency", kind: "asset", rate: 0 },
			{ id: "pvd", kind: "asset", rate: 0 },
			{ id: "rmf", kind: "asset", rate: 0 },
		],
		flows: [
			...stored.document.flows,
			{
				id: "pvd-saving",
				kind: "contribution",
				target: "pvd",
				frequency: "monthly",
				start: "2027-01-01",
				endAt: "retire",
				amount: "1000.00",
				growth: { bps: 0 },
			},
			{
				id: "salary",
				kind: "income",
				frequency: "monthly",
				start: "2027-01-01",
				endAt: "retire",
				amount: "30000.00",
				growth: { bps: 0 },
				earned: true,
			},
		],
	}
	const answer = await post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: stored.hash,
		document,
	})
	if (!answer.ok) throw new Error(answer.error.message)
	return storedPlan().document
}

/** One change saved as the page saves it: one `apply-plan` Edit over the hash the page read. */
export async function save(change: RoutingChange) {
	const stored = storedPlan()
	return post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: stored.hash,
		document: documentWith(stored.document, change),
	})
}

/** The plan's run in an Edit's answer. */
export function runOf(answer: Awaited<ReturnType<typeof post>>): ProjectionRun {
	if (!answer.ok) throw new Error(answer.error.message)
	const read = answer.snapshot.reads.projections[PLAN]
	if (read === undefined || !read.ok) throw new Error(`no run: ${JSON.stringify(read)}`)
	return read.data
}
