// What the account-income tests share: the page's own functions run against the scratch ledger and the real traj.
import { expect, test } from "bun:test"
import type { ProjectionRun, Snapshot } from "../src/lib/contract"
import { accountFromDraft } from "../src/lib/view/plan-items/account-draft"
import type { IncomeContext } from "../src/lib/view/plan-items/account-income"
import { accountDraftOf } from "../src/lib/view/plan-items/accounts"
import { withAccount } from "../src/lib/view/plan-items/document"
import { flowDraftOf } from "../src/lib/view/plan-items/flows"
import { salaryFromDraft, withSalary } from "../src/lib/view/plan-items/salary-draft"
import { SLOW_MS } from "./edit-fixture.test-support"
import { PLAN, PROVIDENT, post, storedPlan } from "./income-ledger.test-support"

export const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)

export const INCOME: IncomeContext = { taxed: false, milestones: ["retire"], anchors: [] }

/** The Snapshot an Edit answered with, or its refusal as an error. */
export function snapshotOf(answer: Awaited<ReturnType<typeof post>>): Snapshot {
	if (!answer.ok) throw new Error(answer.error.message)
	return answer.snapshot
}

export function runOf(snapshot: Snapshot): ProjectionRun {
	const read = snapshot.reads.projections[PLAN]
	if (read === undefined || !read.ok) throw new Error("the plan has no projection")
	return read.data
}

/** Saves the salary with the employer's 5% into the provident fund, as the Income page's form does: one `apply-plan` Edit. */
export async function saveEmployerShare(share = "5") {
	const stored = storedPlan()
	const salary = stored.document.flows.find((flow) => flow.id === "salary")
	const result = salaryFromDraft(
		flowDraftOf(salary),
		{ account: PROVIDENT, share, rounding: "floor" },
		{ kind: "income", existing: salary, doc: stored.document },
	)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: stored.hash,
		document: withSalary(stored.document, result),
	})
}

/** Saves a quarterly payout from the retirement Milestone and a 1 per cent fee on the fund, as the Assets page's form does. */
export async function savePayoutAndFee(fund: string) {
	const stored = storedPlan()
	const existing = stored.document.accounts.find((account) => account.id === fund)
	const draft = accountDraftOf(existing, INCOME)
	const result = accountFromDraft(
		{
			...draft,
			payout: {
				...draft.payout,
				rate: "3.5",
				frequency: "quarterly",
				rounding: "floor",
				from: "milestone",
				milestone: "retire",
			},
			fee: { rate: "1", rounding: "floor" },
		},
		{ existing, taken: [], income: INCOME },
	)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: stored.hash,
		document: withAccount(stored.document, result.account),
	})
}

/** What a year of the fund charges and pays out, worked by hand in minor units: no interest, a fee of `feeBps` read before the
 * payout of the month and taken after it (sim ADR 0028), and 3.5% a year paid every quarter from 30 September (sim ADR 0027). */
export function oracle(value: bigint, feeBps: bigint): { fees: bigint; payouts: bigint } {
	let held = value
	let fees = 0n
	let payouts = 0n
	for (let month = 1; month <= 12; month++) {
		const fee = (held * feeBps) / 120000n
		const payout = month === 9 || month === 12 ? (held * 350n) / 40000n : 0n
		held -= fee + payout
		fees += fee
		payouts += payout
	}
	return { fees, payouts }
}

/** A decimal string of major units as the minor units it holds: "7316.29" is 731629. Test arithmetic only. */
export const minor = (amount: string): bigint => BigInt(amount.replace(".", ""))
export { expect }
