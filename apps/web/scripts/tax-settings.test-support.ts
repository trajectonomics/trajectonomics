// Helpers of the tax profile's end-to-end tests: the plan as the Snapshot shows its tax, and one tax Edit.
import type { TaxAllowances, TaxProfile } from "../src/lib/contract"
import type { EditAnswer } from "../src/lib/edit/answer"
import { PLAN, post, storedPlan } from "./estate-ledger.test-support"

/** The plan as the Snapshot shows it: its stored profile and whether it is taxed. */
export function shownTax(answer: EditAnswer): {
	tax: TaxProfile | null
	taxed: boolean | undefined
	taxAllowances: TaxAllowances | undefined
} {
	if (!answer.ok) throw new Error(answer.error.message)
	const read = answer.snapshot.reads.documents[PLAN]
	if (read === undefined || !read.ok) throw new Error("the plan has no document")
	return {
		tax: read.data.scenario.tax ?? null,
		taxed: read.data.scenario.taxed,
		taxAllowances: read.data.scenario.taxAllowances,
	}
}

/** One tax Edit, naming the hash of the plan as stored now. */
export const send = (kind: string, flags?: object) =>
	post("edit", { kind, name: PLAN, contentHash: storedPlan().hash, ...(flags ? { flags } : {}) })

/** The plan with a whole profile of two children, one at the higher rate, and a life insurance premium. */
export const withProfile = () =>
	send("set-tax", {
		filingStatus: "married_joint",
		children: "2",
		childrenAtHigherRate: "1",
		lifeInsurance: "20000",
	})
