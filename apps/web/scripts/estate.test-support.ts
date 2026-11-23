// What the Estate tests share: the page's own functions run against the scratch ledger and the real traj.
import { expect, test } from "bun:test"
import type { ProjectionRun } from "../src/lib/contract"
import type { EditAnswer } from "../src/lib/edit/answer"
import { blockFromDraft, draftOf, withEstate } from "../src/lib/view/estate"
import { type EstateDraft, emptyLine } from "../src/lib/view/estate/draft"
import { SLOW_MS } from "./edit-fixture.test-support"
import { PLAN, post, storedPlan } from "./estate-ledger.test-support"

/** A test against the real CLI: a fresh ledger takes a while per Edit. */
export const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)

/** The run of the plan in an answer, as the page reads it. */
export function runOf(answer: EditAnswer): ProjectionRun {
	if (!answer.ok) throw new Error(answer.error.message)
	const read = answer.snapshot.reads.projections[PLAN]
	if (read === undefined || !read.ok) throw new Error("the plan has no projection")
	return read.data
}

/** A 1% settlement cost of everything owned and a gift of 5% of the net, each typed the way a person types a share. */
export function typedLines(settlement = "1", gift = "5"): EstateDraft {
	return {
		costs: [
			{
				...emptyLine(),
				name: "settlement",
				how: "share",
				share: settlement,
				rounding: "halfUp",
				of: "gross",
			},
		],
		gifts: [{ ...emptyLine(), name: "temple", how: "share", share: gift, rounding: "halfUp" }],
	}
}

/** Saves a draft as the page does: one `apply-plan` Edit that names the hash it read, over the stored document. */
export async function saveDraft(draft: EstateDraft): Promise<EditAnswer> {
	const made = blockFromDraft(draft)
	if (!made.ok) throw new Error(JSON.stringify(made.problems))
	const stored = storedPlan()
	return post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: stored.hash,
		document: withEstate(stored.document, made.block),
	})
}

/** The plan with the typed lines saved, so a test needs no other test to have run before it. */
export async function withSavedLines(): Promise<ProjectionRun> {
	const draft = draftOf(storedPlan().document.estate)
	if (draft.costs.length === 1 && draft.gifts.length === 1) return runOf(await post("reread", {}))
	const answer = await saveDraft(typedLines())
	expect(answer.ok).toBe(true)
	return runOf(answer)
}

/** The plan with no estate block, as it was before any line: removes the lines when a test left them. */
export async function withoutLines(): Promise<ProjectionRun> {
	if (storedPlan().document.estate === undefined) return runOf(await post("reread", {}))
	const answer = await saveDraft({ costs: [], gifts: [] })
	expect(answer.ok).toBe(true)
	return runOf(answer)
}
