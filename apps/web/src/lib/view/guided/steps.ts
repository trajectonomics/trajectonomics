/**
 * The three steps of a guided first plan, their order, and every problem that holds the person on a step
 * ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)).
 * Pure: the draft in, the step's problems out. Back never clears an answer.
 */
import { planNameError } from "../../edit/name"
import type { PersonDraft } from "../household/person-draft"
import type { MoneyView } from "./money"
import {
	amountProblem,
	keepProblem,
	type RowDrafts,
	type TotalsDraft,
	totalProblem,
} from "./money-draft"
import { peopleOf } from "./people"
import { ageProblem } from "./stop"

/** The steps in the order the page asks them. */
export const STEPS = ["household", "money", "stop"] as const

/** One step. */
export type Step = (typeof STEPS)[number]

/** The words that head each step, and name it in the list. */
export const STEP_LABELS: Readonly<Record<Step, string>> = {
	household: "You and your household",
	money: "Your money",
	stop: "When you would stop working",
}

/** Everything the three steps ask, as it stands. */
export interface GuidedDraft {
	readonly money: MoneyView
	readonly people: readonly PersonDraft[]
	readonly rows: RowDrafts
	readonly totals: TotalsDraft
	readonly name: string
	readonly age: string
	/** Every plan name the ledger holds, so a new plan cannot repeat one. */
	readonly stored: readonly string[]
}

/** The step before a step, or null on the first. */
export function previousOf(step: Step): Step | null {
	const index = STEPS.indexOf(step)
	return index <= 0 ? null : (STEPS[index - 1] ?? null)
}

/** The step after a step, or null on the last. */
export function nextOf(step: Step): Step | null {
	return STEPS[STEPS.indexOf(step) + 1] ?? null
}

/** The money step's problems: a row or total that cannot be sent, and every row dropped. */
function moneyProblems(draft: GuidedDraft): string[] {
	if (draft.money.path === "totals") {
		return [totalProblem(draft.totals.income), totalProblem(draft.totals.spending)].filter(
			(problem): problem is string => problem !== null,
		)
	}
	const rows = draft.money.rows.map((row) => amountProblem(draft.rows[row.id]?.amount ?? ""))
	const keep = keepProblem(draft.rows)
	return [...rows, ...(keep === null ? [] : [keep])].filter(
		(problem): problem is string => problem !== null,
	)
}

/** Every problem that holds the person on a step; an empty list lets them go on. */
export function problemsOf(step: Step, draft: GuidedDraft): readonly string[] {
	if (step === "household") return peopleOf(draft.people).problems.map((one) => one.problem)
	if (step === "money") return moneyProblems(draft)
	const holder = peopleOf(draft.people).holderLifeExpectancy
	const name = planNameError(draft.name, draft.stored)
	const age = ageProblem(draft.age, holder)
	return [name, age].filter((problem): problem is string => problem !== null)
}
